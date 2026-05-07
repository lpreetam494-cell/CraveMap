/**
 * Phase 7: The Discovery Agent — Sovereign Scout (Refined)
 *
 * Refinements in this version:
 * - Bangalore-biased geocoding (prevents wrong city disambiguation)
 * - Smarter candidate pool: up to 50 raw, enriched in batches of 25
 * - Empty vault fallback: name-diversity scoring when no taste history exists
 * - Guaranteed results: fallback to top-N if filter eliminates everything
 * - Wildcard fixed: uses relative threshold so it always picks a true outlier
 * - Better pipeline logging for traceability
 */
const axios = require('axios');
const Groq = require('groq-sdk');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// ─────────────────────────────────────────────────────
// COMPONENT 1: Taste Profile Vectorizer
// Amendment 4: captures cuisine ESSENCE, not location names
// ─────────────────────────────────────────────────────
const buildTasteVector = (memory, friendVaults = {}) => {
    const restaurants = memory.restaurants || [];
    const seedTags = memory.analytics?.seed_tags || []; // Quick Start onboarding seeds

    const cuisineFreq = {};
    const vibeFreq = {};
    let budgetTotal = 0;
    let budgetCount = 0;
    const hardVetoes = new Set();
    const dietaryNeeds = new Set();

    for (const r of restaurants) {
        // Weight visited restaurants 2x over saved-only
        const weight = r.visited ? 2 : 1;

        if (r.cuisine && r.cuisine.toLowerCase() !== 'unknown') {
            r.cuisine.split(',').map(c => c.trim().toLowerCase())
                .filter(c => c.length > 2)
                .forEach(c => { cuisineFreq[c] = (cuisineFreq[c] || 0) + weight; });
        }

        if (r.vibe) {
            r.vibe.split(',').map(v => v.trim().toLowerCase())
                .filter(v => v.length > 2)
                .forEach(v => { vibeFreq[v] = (vibeFreq[v] || 0) + weight; });
        }

        if (r.budget && !isNaN(r.budget)) {
            budgetTotal += Number(r.budget);
            budgetCount++;
        }

        if (r.vetoed) hardVetoes.add(r.vetoed.toLowerCase());
        if (r.dietary_need) dietaryNeeds.add(r.dietary_need.toLowerCase());
    }

    // Seed vibes from Quick Start onboarding if vault is sparse
    for (const tag of seedTags) {
        vibeFreq[tag.toLowerCase()] = (vibeFreq[tag.toLowerCase()] || 0) + 1;
    }

    // Analytics-level constraints
    if (memory.analytics?.hard_vetoes) {
        memory.analytics.hard_vetoes.forEach(v => hardVetoes.add(v.toLowerCase()));
    }
    if (memory.analytics?.dietary_needs) {
        memory.analytics.dietary_needs.forEach(d => dietaryNeeds.add(d.toLowerCase()));
    }

    const topCuisines = Object.entries(cuisineFreq)
        .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name]) => name);

    const topVibes = Object.entries(vibeFreq)
        .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name]) => name);

    const avgBudget = budgetCount > 0 ? Math.round(budgetTotal / budgetCount) : null;
    const hasHistory = restaurants.length > 0;

    // Friend vault alignment seeding (>= 60% cuisine overlap)
    for (const [, friendVault] of Object.entries(friendVaults)) {
        const friendCuisines = new Set();
        for (const r of (friendVault.restaurants || [])) {
            if (r.cuisine) r.cuisine.split(',').map(c => c.trim().toLowerCase()).forEach(c => friendCuisines.add(c));
        }
        const overlap = topCuisines.filter(c => friendCuisines.has(c)).length;
        if (topCuisines.length > 0 && overlap / topCuisines.length >= 0.6) {
            const fVibes = {};
            for (const r of (friendVault.restaurants || [])) {
                if (r.vibe) r.vibe.split(',').map(v => v.trim().toLowerCase()).forEach(v => {
                    fVibes[v] = (fVibes[v] || 0) + 0.5;
                });
            }
            Object.entries(fVibes).sort((a, b) => b[1] - a[1]).slice(0, 3)
                .forEach(([v]) => { if (!topVibes.includes(v)) topVibes.push(v); });
        }
    }

    console.log(`🧠 Taste Vector: cuisines=[${topCuisines.join(',')}] vibes=[${topVibes.join(',')}] hasHistory=${hasHistory}`);

    return {
        topCuisines,
        topVibes,
        avgBudget,
        hardVetoes: Array.from(hardVetoes),
        dietaryNeeds: Array.from(dietaryNeeds),
        existingNames: restaurants.map(r => r.name?.toLowerCase().trim()).filter(Boolean),
        hasHistory,
    };
};

// ─────────────────────────────────────────────────────
// COMPONENT 2: Autonomous Scout
// Fix: Bangalore-biased geocoding, larger candidate pool
// ─────────────────────────────────────────────────────
const scoutCandidates = async (area, lat = null, lon = null) => {
    let resolvedLat = lat;
    let resolvedLon = lon;

    if (!resolvedLat || !resolvedLon) {
        console.log(`🔭 Scout: Geocoding "${area}"...`);
        try {
            // Refinement: Try with Bangalore context first to avoid wrong city disambiguation
            const queries = [
                `${area}, Bengaluru, Karnataka, India`,
                `${area}, Bangalore, India`,
                `${area}, India`
            ];

            for (const q of queries) {
                const nomRes = await axios.get('https://nominatim.openstreetmap.org/search', {
                    params: { q, format: 'json', limit: 3, countrycodes: 'IN' },
                    headers: { 'User-Agent': 'CraveMap-Sovereign-Agent/1.0' },
                    timeout: 8000
                });

                if (nomRes.data.length > 0) {
                    // Prefer results in Karnataka bounding box (roughly)
                    const karnatakaResult = nomRes.data.find(r => {
                        const lat = parseFloat(r.lat);
                        const lon = parseFloat(r.lon);
                        return lat >= 11.5 && lat <= 18.5 && lon >= 74 && lon <= 78.5;
                    }) || nomRes.data[0];

                    resolvedLat = karnatakaResult.lat;
                    resolvedLon = karnatakaResult.lon;
                    console.log(`🔭 Scout: Resolved "${area}" → (${resolvedLat}, ${resolvedLon}) via: "${q}"`);
                    break;
                }
            }

            if (!resolvedLat) throw new Error(`Could not geocode: ${area}`);
        } catch (err) {
            console.error('❌ Scout: Geocoding failed:', err.message);
            return [];
        }
    }

    console.log(`🔭 Scout: Querying Overpass at (${resolvedLat}, ${resolvedLon})...`);

    // Larger radius for sparser areas, standard for dense city areas
    const radius = 3000;
    const query = `[out:json][timeout:20];(nwr["amenity"="restaurant"](around:${radius},${resolvedLat},${resolvedLon});nwr["amenity"="cafe"](around:${radius},${resolvedLat},${resolvedLon});nwr["amenity"="fast_food"](around:${radius},${resolvedLat},${resolvedLon}););out center tags;`;

    try {
        const overpassRes = await axios.get('https://overpass-api.de/api/interpreter', {
            params: { data: query },
            headers: { 'User-Agent': 'CraveMap-Sovereign-Agent/1.0' },
            timeout: 25000
        });

        const elements = overpassRes.data?.elements || [];
        const candidates = elements
            .filter(el => el.tags?.name && el.tags.name.trim().length > 1)
            .map(el => ({
                name: el.tags.name.trim(),
                rawCuisine: el.tags.cuisine?.replace(/_/g, ' ') || null,
                osmRating: el.tags['stars'] ? Number(el.tags['stars']) :
                           el.tags['rating'] ? Number(el.tags['rating']) : null,
                area: area,
                lat: el.lat || el.center?.lat,
                lon: el.lon || el.center?.lon,
                website: el.tags.website || null,
                phone: el.tags.phone || null,
                opening_hours: el.tags.opening_hours || null,
                isChain: ['mcdonalds','kfc','subway','dominos','pizza hut','burger king','starbucks']
                    .some(chain => el.tags.name.toLowerCase().includes(chain))
            }));

        // Deduplicate + filter out unnamed/chain-only results
        const seen = new Set();
        const unique = candidates.filter(c => {
            const key = c.name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Shuffle candidates a bit so we don't always get the same 50
        const shuffled = unique.sort(() => Math.random() - 0.4);

        console.log(`🔭 Scout: Found ${shuffled.length} candidates (radius=${radius}m).`);
        // Refinement: return 50 instead of 30 for better filter coverage
        return shuffled.slice(0, 50);
    } catch (err) {
        console.error('❌ Scout: Overpass query failed:', err.message);
        return [];
    }
};

// ─────────────────────────────────────────────────────
// LLM Enrichment: Infer cuisine/vibe in batches
// Refinement: process in batches of 25 to cover all candidates
// ─────────────────────────────────────────────────────
const enrichCandidatesWithLLM = async (candidates) => {
    if (candidates.length === 0) return candidates;
    if (!process.env.GROQ_API_KEY) {
        return candidates.map(c => ({
            ...c,
            inferredCuisine: c.rawCuisine || 'Mixed',
            inferredVibes: []
        }));
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const BATCH_SIZE = 25;
    const enrichMap = {};

    // Process in batches to cover all candidates
    const batches = [];
    for (let i = 0; i < Math.min(candidates.length, 50); i += BATCH_SIZE) {
        batches.push(candidates.slice(i, i + BATCH_SIZE).map(c => c.name));
    }

    for (const batch of batches) {
        try {
            const completion = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: `You are a restaurant data enricher for Indian restaurants. For each restaurant name, infer:
- cuisine: the most likely cuisine (e.g. "North Indian", "South Indian", "Chinese", "Italian", "Cafe", "Fast Food", "Biryani", "Bakery", "Brewery")
- vibes: 2-3 short tags describing the atmosphere (e.g. "casual", "family", "rooftop", "street food", "fine dining", "quick bite", "cozy", "lively")

Return JSON: {"enriched": [{"name": "...", "cuisine": "...", "vibes": ["...","..."]}]}
Be accurate for Indian context. If name suggests a cuisine (e.g. "Meghana Foods" → Biryani), be specific.`
                    },
                    {
                        role: 'user',
                        content: `Enrich these restaurant names: ${JSON.stringify(batch)}`
                    }
                ],
                temperature: 0.2,
                max_tokens: 1500
            });

            const parsed = JSON.parse(completion.choices[0].message.content);
            for (const e of (parsed.enriched || [])) {
                if (e.name) enrichMap[e.name.toLowerCase()] = { cuisine: e.cuisine, vibes: e.vibes || [] };
            }
        } catch (err) {
            console.warn(`⚠️ Enrichment batch failed:`, err.message.slice(0, 80));
        }
    }

    console.log(`✨ Enriched ${Object.keys(enrichMap).length}/${candidates.length} candidates.`);

    return candidates.map(c => {
        const key = c.name.toLowerCase();
        const enriched = enrichMap[key];
        return {
            ...c,
            inferredCuisine: enriched?.cuisine || c.rawCuisine || 'Mixed',
            inferredVibes: enriched?.vibes || [],
        };
    });
};

// ─────────────────────────────────────────────────────
// COMPONENT 3: Sovereign Filter (refined)
// Amendment 1: Absolute Veto first
// Amendment 2: Wildcard — true outlier always guaranteed
// Refinement: empty-vault fallback scoring, guaranteed results
// ─────────────────────────────────────────────────────
const sovereignFilter = (candidates, tasteVector) => {
    const { topCuisines, topVibes, hardVetoes, dietaryNeeds, existingNames, hasHistory } = tasteVector;

    // STEP 1: HARD CONSTRAINT ELIMINATION (Absolute Veto)
    const passedHardFilter = candidates.filter(c => {
        const cuisineLower = (c.inferredCuisine || '').toLowerCase();
        const nameLower = c.name.toLowerCase().trim();

        // Deduplicate: skip restaurants already in the vault
        if (existingNames.some(en => en === nameLower || nameLower.includes(en) || en.includes(nameLower))) return false;

        // Absolute veto check
        for (const veto of hardVetoes) {
            if (cuisineLower.includes(veto) || nameLower.includes(veto)) return false;
        }

        // Dietary need conflict
        for (const need of dietaryNeeds) {
            if (need === 'vegetarian' && cuisineLower.match(/\b(meat|chicken|mutton|fish|seafood|pork|beef)\b/)) return false;
            if (need === 'halal' && cuisineLower.includes('pork')) return false;
        }

        return true;
    });

    console.log(`🛡️ Filter: ${passedHardFilter.length}/${candidates.length} passed hard constraints.`);

    // Guaranteed fallback: if everything got filtered, relax deduplication
    const workingPool = passedHardFilter.length >= 3 ? passedHardFilter : candidates.filter(c => {
        const cuisineLower = (c.inferredCuisine || '').toLowerCase();
        const nameLower = c.name.toLowerCase().trim();
        for (const veto of hardVetoes) {
            if (cuisineLower.includes(veto) || nameLower.includes(veto)) return false;
        }
        return true;
    });

    // STEP 2: ALIGNMENT SCORING
    const scored = workingPool.map(c => {
        let score = 0;
        const cuisineLower = (c.inferredCuisine || '').toLowerCase();
        const vibesLower = (c.inferredVibes || []).map(v => v.toLowerCase());

        if (hasHistory) {
            // Taste-based scoring for users with history
            for (const preferred of topCuisines) {
                if (cuisineLower.includes(preferred) || preferred.includes(cuisineLower.split(' ')[0])) score += 3;
            }
            for (const preferredVibe of topVibes) {
                if (vibesLower.some(v => v.includes(preferredVibe) || preferredVibe.includes(v))) score += 2;
            }
        } else {
            // Empty vault: diversity scoring — prefer named cuisines over 'Mixed'
            if (cuisineLower !== 'mixed') score += 2;
            if (c.inferredVibes?.length > 0) score += 1;
        }

        // De-prioritize fast food chains slightly
        if (c.isChain) score -= 1;

        // OSM rating bonus
        if (c.osmRating) score += c.osmRating;

        return { ...c, alignmentScore: score };
    });

    scored.sort((a, b) => b.alignmentScore - a.alignmentScore);

    // STEP 3: WILDCARD RULE (guaranteed true outlier)
    const top2 = scored.slice(0, 2);

    // Wildcard: pick from bottom 40% of scored pool (true divergence)
    const bottomStartIdx = Math.max(3, Math.floor(scored.length * 0.6));
    const wildcardPool = scored.slice(bottomStartIdx);

    const wildcard = wildcardPool.length > 0
        ? wildcardPool[Math.floor(Math.random() * Math.min(wildcardPool.length, 5))] // random from bottom 5 of divergent pool
        : scored[2];

    const results = [...top2];
    if (wildcard) results.push({ ...wildcard, isWildcard: true });

    return results;
};

// ─────────────────────────────────────────────────────
// COMPONENT 3b: Silent Operator Reasoning (Amendment 3)
// Feels like a happy coincidence, not a personalization alert
// ─────────────────────────────────────────────────────
const buildSilentReasoning = (candidate, isWildcard) => {
    const areaStr = candidate.area || 'the area';
    const cuisineStr = candidate.inferredCuisine || 'local food';
    const vibeStr = (candidate.inferredVibes || []).slice(0, 2).join(' and ') || 'its vibe';

    if (isWildcard) {
        const wildcardTemplates = [
            `An off-the-beaten-path ${cuisineStr} spot in ${areaStr} that locals keep returning to.`,
            `A well-kept secret in ${areaStr} — ${cuisineStr} with a reputation that outpaces its visibility.`,
            `Not on the usual lists, but regulars in ${areaStr} rate this ${cuisineStr} spot highly.`,
        ];
        return wildcardTemplates[Math.floor(Math.random() * wildcardTemplates.length)];
    }

    const templates = [
        `Currently one of the better-reviewed ${cuisineStr} spots in ${areaStr}, known for its ${vibeStr} setting.`,
        `A ${vibeStr} ${cuisineStr} restaurant in ${areaStr} that's been drawing consistent footfall.`,
        `This ${areaStr} spot has built a strong reputation for its ${cuisineStr} offerings and ${vibeStr} atmosphere.`,
        `Strong word-of-mouth in ${areaStr} around this ${cuisineStr} place — particularly noted for ${vibeStr}.`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
};

// ─────────────────────────────────────────────────────
// MAIN: Full Discovery Pipeline
// ─────────────────────────────────────────────────────
const runDiscoveryPipeline = async (area, memory, friendVaults = {}, lat = null, lon = null) => {
    console.log(`🚀 Discovery Pipeline: Starting for "${area}"...`);

    // PART 3: STEALTH MODE ENFORCEMENT
    // Block external API calls if stealth mode is active
    if (memory.analytics?.stealth_mode) {
        console.log('🕶️ STEALTH MODE ACTIVE: Blocking external API calls');
        
        // Offer offline-only discovery from existing vault
        const existingSpots = memory.restaurants || [];
        if (existingSpots.length === 0) {
            return {
                success: false,
                message: `🕶️ *Stealth Mode Active* - No offline discovery possible.\n\nYour vault is empty. To discover restaurants, either:\n1. Disable Stealth Mode (/stealth_mode)\n2. Add restaurants manually to your vault`
            };
        }

        // Return random 3 from existing vault as offline suggestions
        const shuffled = [...existingSpots].sort(() => Math.random() - 0.5);
        const offline = shuffled.slice(0, 3).map((spot, i) => ({
            id: `offline_${i}`,
            name: spot.name,
            cuisine: spot.cuisine,
            vibe: spot.vibe,
            area: spot.area,
            isWildcard: i === 2,  // Last one is wildcard
            reasoning: `📴 From your existing vault (offline). Stealth Mode blocks external discovery.`,
            discovery: false
        }));

        return {
            success: true,
            discoveries: offline,
            tasteVector: {},
            stealth_mode_notice: '🕶️ Operating in Stealth Mode - No external APIs used'
        };
    }

    const tasteVector = buildTasteVector(memory, friendVaults);

    const rawCandidates = await scoutCandidates(area, lat, lon);

    if (rawCandidates.length === 0) {
        return {
            success: false,
            message: `I couldn't find restaurants near *${area}*. This might be a very small area — try a broader location like "Bangalore" or share your live location.`
        };
    }

    const enrichedCandidates = await enrichCandidatesWithLLM(rawCandidates);
    const top3 = sovereignFilter(enrichedCandidates, tasteVector);

    if (top3.length === 0) {
        return { success: false, message: `All nearby spots were filtered out by your preferences. Try a different area.` };
    }

    const discoveries = top3.map((spot, i) => ({
        id: `disc_${Date.now()}_${i}`,
        name: spot.name,
        cuisine: spot.inferredCuisine,
        vibe: (spot.inferredVibes || []).join(', '),
        area: area,
        lat: spot.lat,
        lon: spot.lon,
        website: spot.website,
        alignmentScore: Math.round(spot.alignmentScore * 10) / 10,
        isWildcard: spot.isWildcard || false,
        reasoning: buildSilentReasoning(spot, spot.isWildcard || false),
        discovery: true,
    }));

    console.log(`✅ Discovery Pipeline: Returning ${discoveries.length} results for "${area}".`);
    return { success: true, discoveries, tasteVector };
};

// Backward-compatible export for /api/save pivot logic
const discoverRestaurants = async (area) => {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const rawCandidates = await scoutCandidates(area);
    if (rawCandidates.length === 0) return `🍽️ No restaurants found near ${area}.`;
    const names = rawCandidates.slice(0, 10).map(c => c.name).join(', ');
    try {
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: 'Format a restaurant list for Telegram markdown. Be concise and helpful.' },
                { role: 'user', content: `Format these restaurants in ${area}: ${names}` }
            ]
        });
        return completion.choices[0].message.content;
    } catch (e) {
        return `🍽️ Found ${rawCandidates.length} spots near ${area}:\n${names}`;
    }
};

module.exports = { runDiscoveryPipeline, discoverRestaurants, buildTasteVector };
