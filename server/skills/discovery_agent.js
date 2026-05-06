/**
 * Phase 7: The Discovery Agent — Sovereign Scout
 *
 * 4 Core Amendments:
 * 1. Absolute Veto: hard constraints applied BEFORE scoring
 * 2. Wildcard Rule: 3rd slot reserved for serendipitous high-rated outlier
 * 3. Silent Operator: reasoning strings read like happy coincidences, not personalization alerts
 * 4. Location Awareness: taste vector captures cuisine/vibe essence, not city-specific locations
 */
const axios = require('axios');
const Groq = require('groq-sdk');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// ─────────────────────────────────────────────────────
// COMPONENT 1: Taste Profile Vectorizer
// Extracts essence of the user's taste (cuisine, vibe, budget)
// from their local vault + optional friend vault alignment seeding.
// Amendment 4: prioritizes cuisine TYPE over location data.
// ─────────────────────────────────────────────────────
const buildTasteVector = (memory, friendVaults = {}) => {
    const restaurants = memory.restaurants || [];

    // Count cuisine frequencies (normalize by stripping location info)
    const cuisineFreq = {};
    const vibeFreq = {};
    let budgetTotal = 0;
    let budgetCount = 0;
    const hardVetoes = new Set();
    const dietaryNeeds = new Set();

    for (const r of restaurants) {
        // Cuisine frequency — split on commas for multi-cuisine entries
        if (r.cuisine && r.cuisine.toLowerCase() !== 'unknown') {
            const parts = r.cuisine.split(',').map(c => c.trim().toLowerCase());
            for (const p of parts) cuisineFreq[p] = (cuisineFreq[p] || 0) + (r.visited ? 2 : 1);
        }

        // Vibe tag frequency
        if (r.vibe) {
            const tags = r.vibe.split(',').map(v => v.trim().toLowerCase());
            for (const t of tags) vibeFreq[t] = (vibeFreq[t] || 0) + 1;
        }

        // Budget rating
        if (r.budget && !isNaN(r.budget)) {
            budgetTotal += Number(r.budget);
            budgetCount++;
        }

        // Hard vetoes
        if (r.vetoed) hardVetoes.add(r.vetoed.toLowerCase());
        if (r.dietary_need) dietaryNeeds.add(r.dietary_need.toLowerCase());
    }

    // Also check memory-level constraints
    if (memory.analytics?.hard_vetoes) {
        (memory.analytics.hard_vetoes).forEach(v => hardVetoes.add(v.toLowerCase()));
    }
    if (memory.analytics?.dietary_needs) {
        (memory.analytics.dietary_needs).forEach(d => dietaryNeeds.add(d.toLowerCase()));
    }

    // Top 5 cuisines and top 5 vibes by frequency
    const topCuisines = Object.entries(cuisineFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);

    const topVibes = Object.entries(vibeFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);

    const avgBudget = budgetCount > 0 ? Math.round(budgetTotal / budgetCount) : null;

    // Amendment 4: Friend vault alignment seeding
    // If a friend vault has overlap > 60% on top cuisines, seed their vibes
    for (const [friendName, friendVault] of Object.entries(friendVaults)) {
        const friendRestaurants = friendVault.restaurants || [];
        const friendCuisines = new Set();
        for (const r of friendRestaurants) {
            if (r.cuisine) r.cuisine.split(',').map(c => c.trim().toLowerCase()).forEach(c => friendCuisines.add(c));
        }
        const overlapCount = topCuisines.filter(c => friendCuisines.has(c)).length;
        const alignment = topCuisines.length > 0 ? overlapCount / topCuisines.length : 0;

        if (alignment >= 0.6) {
            // Seed friend's top vibes into vector (with half weight)
            const friendVibeFreq = {};
            for (const r of friendRestaurants) {
                if (r.vibe) r.vibe.split(',').map(v => v.trim().toLowerCase()).forEach(v => {
                    friendVibeFreq[v] = (friendVibeFreq[v] || 0) + 0.5;
                });
            }
            const topFriendVibes = Object.entries(friendVibeFreq)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name]) => name);
            // Merge without duplicates
            for (const v of topFriendVibes) {
                if (!topVibes.includes(v)) topVibes.push(v);
            }
        }
    }

    return {
        topCuisines,
        topVibes,
        avgBudget,
        hardVetoes: Array.from(hardVetoes),
        dietaryNeeds: Array.from(dietaryNeeds),
        existingNames: restaurants.map(r => r.name?.toLowerCase()).filter(Boolean)
    };
};

// ─────────────────────────────────────────────────────
// COMPONENT 2: Autonomous Scout (Privacy-Safe External API Call)
// Sends ONLY coordinates to Overpass — NO private taste data.
// ─────────────────────────────────────────────────────
const scoutCandidates = async (area, lat = null, lon = null) => {
    let resolvedLat = lat;
    let resolvedLon = lon;

    // Geocode area name if coordinates not provided
    if (!resolvedLat || !resolvedLon) {
        console.log(`🔭 Scout: Geocoding "${area}" via Nominatim...`);
        try {
            const nomRes = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: { q: `${area}, India`, format: 'json', limit: 1 },
                headers: { 'User-Agent': 'CraveMap-Sovereign-Agent/1.0' }
            });
            if (nomRes.data.length > 0) {
                resolvedLat = nomRes.data[0].lat;
                resolvedLon = nomRes.data[0].lon;
            } else {
                throw new Error(`Could not geocode: ${area}`);
            }
        } catch (err) {
            console.error('❌ Scout: Geocoding failed:', err.message);
            return [];
        }
    }

    console.log(`🔭 Scout: Querying Overpass at (${resolvedLat}, ${resolvedLon})...`);

    // SANITIZED query — no cuisine filters, no taste data, pure geographic radius
    const query = `
        [out:json][timeout:15];
        (
          nwr["amenity"="restaurant"](around:2500,${resolvedLat},${resolvedLon});
          nwr["amenity"="cafe"](around:2500,${resolvedLat},${resolvedLon});
        );
        out center;
    `;

    try {
        const overpassRes = await axios.post(
            'https://overpass-api.de/api/interpreter',
            `data=${encodeURIComponent(query)}`,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 }
        );

        const elements = overpassRes.data?.elements || [];
        const candidates = elements
            .filter(el => el.tags?.name)
            .map(el => ({
                name: el.tags.name,
                rawCuisine: el.tags.cuisine || null,
                rawVibe: null, // OSM rarely has this
                osmRating: el.tags.stars ? Number(el.tags.stars) : null,
                area: area,
                lat: el.lat || el.center?.lat,
                lon: el.lon || el.center?.lon,
                website: el.tags.website || null,
            }));

        // Deduplicate by name
        const seen = new Set();
        const unique = candidates.filter(c => {
            const key = c.name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        console.log(`🔭 Scout: Found ${unique.length} unique candidates.`);
        return unique.slice(0, 30); // Return up to 30 for the filter to work with
    } catch (err) {
        console.error('❌ Scout: Overpass query failed:', err.message);
        return [];
    }
};

// ─────────────────────────────────────────────────────
// LLM Enrichment: Infer cuisine/vibe from restaurant name
// No private vault data is sent — only raw OSM names.
// ─────────────────────────────────────────────────────
const enrichCandidatesWithLLM = async (candidates) => {
    if (candidates.length === 0) return candidates;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const names = candidates.map(c => c.name);

    try {
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You are a restaurant data enricher. Given a list of restaurant names from India, infer their most likely cuisine type and 2-3 vibe tags. Return a JSON object with format: {"enriched": [{"name": "...", "cuisine": "...", "vibes": ["...","..."]}]}. Be concise and accurate.'
                },
                {
                    role: 'user',
                    content: `Enrich these restaurant names: ${JSON.stringify(names.slice(0, 20))}`
                }
            ],
            temperature: 0.3
        });

        const parsed = JSON.parse(completion.choices[0].message.content);
        const enrichMap = {};
        for (const e of (parsed.enriched || [])) {
            enrichMap[e.name.toLowerCase()] = { cuisine: e.cuisine, vibes: e.vibes };
        }

        return candidates.map(c => {
            const enriched = enrichMap[c.name.toLowerCase()];
            return {
                ...c,
                inferredCuisine: enriched?.cuisine || c.rawCuisine || 'Mixed',
                inferredVibes: enriched?.vibes || [],
            };
        });
    } catch (err) {
        console.error('⚠️ Enrichment skipped (LLM error):', err.message);
        return candidates.map(c => ({
            ...c,
            inferredCuisine: c.rawCuisine || 'Mixed',
            inferredVibes: []
        }));
    }
};

// ─────────────────────────────────────────────────────
// COMPONENT 3: Sovereign Filter
// Amendment 1: Hard constraints applied FIRST (Absolute Veto)
// Amendment 2: Wildcard Rule — 3rd slot is serendipitous outlier
// ─────────────────────────────────────────────────────
const sovereignFilter = (candidates, tasteVector) => {
    const { topCuisines, topVibes, hardVetoes, dietaryNeeds, existingNames, avgBudget } = tasteVector;

    // --- STEP 1: HARD CONSTRAINT ELIMINATION (Amendment 1) ---
    const passedHardFilter = candidates.filter(c => {
        const cuisineLower = (c.inferredCuisine || '').toLowerCase();
        const nameLower = c.name.toLowerCase();

        // Reject if already in vault (deduplication — true discovery)
        if (existingNames.includes(nameLower)) return false;

        // Reject if cuisine matches an absolute veto
        for (const veto of hardVetoes) {
            if (cuisineLower.includes(veto) || nameLower.includes(veto)) return false;
        }

        // Reject if dietary need conflicts (basic check)
        for (const need of dietaryNeeds) {
            if (need === 'vegetarian' && cuisineLower.includes('meat')) return false;
            if (need === 'halal' && cuisineLower.includes('pork')) return false;
        }

        return true;
    });

    // --- STEP 2: ALIGNMENT SCORING ---
    const scored = passedHardFilter.map(c => {
        let score = 0;
        const cuisineLower = (c.inferredCuisine || '').toLowerCase();
        const vibesLower = (c.inferredVibes || []).map(v => v.toLowerCase());

        // Cuisine match: +3 per matching cuisine
        for (const preferred of topCuisines) {
            if (cuisineLower.includes(preferred)) score += 3;
        }

        // Vibe match: +2 per matching vibe tag
        for (const preferredVibe of topVibes) {
            if (vibesLower.some(v => v.includes(preferredVibe))) score += 2;
        }

        // OSM rating bonus (if available)
        if (c.osmRating) score += c.osmRating * 0.5;

        return { ...c, alignmentScore: score };
    });

    // Sort by alignment score descending
    scored.sort((a, b) => b.alignmentScore - a.alignmentScore);

    // --- STEP 3: WILDCARD RULE (Amendment 2) ---
    // Top 2 are the best alignment matches
    const top2 = scored.slice(0, 2);

    // 3rd slot: highest OSM rating among LOW-alignment candidates (score < top2 avg)
    const top2AvgScore = top2.reduce((sum, c) => sum + c.alignmentScore, 0) / (top2.length || 1);
    const lowAlignmentPool = scored.slice(2).filter(c => c.alignmentScore < top2AvgScore * 0.7);

    // Pick wildcard by highest OSM rating, or just any remaining if no ratings
    const wildcard = lowAlignmentPool.sort((a, b) => (b.osmRating || 0) - (a.osmRating || 0))[0]
        || scored[2]; // fallback to 3rd ranked if no wildcard found

    const results = [...top2];
    if (wildcard) results.push({ ...wildcard, isWildcard: true });

    return results;
};

// ─────────────────────────────────────────────────────
// COMPONENT 3b: Silent Operator Reasoning (Amendment 3)
// Reasoning reads like a happy coincidence, NOT a personalization alert.
// ─────────────────────────────────────────────────────
const buildSilentReasoning = (candidate, isWildcard) => {
    if (isWildcard) {
        return `A well-regarded local spot that's been drawing consistent crowds recently.`;
    }

    const vibeStr = (candidate.inferredVibes || []).slice(0, 2).join(' and ') || 'its welcoming atmosphere';
    const cuisineStr = candidate.inferredCuisine || 'its menu';
    const areaStr = candidate.area || 'the area';

    // Silent Operator phrasing — feels like serendipity
    const templates = [
        `Currently one of the most talked-about ${cuisineStr} spots in ${areaStr} for ${vibeStr}.`,
        `A highly-rated ${cuisineStr} restaurant in ${areaStr}, known for its ${vibeStr}.`,
        `This ${areaStr} spot has been getting strong word-of-mouth for its ${cuisineStr} and ${vibeStr} setting.`,
    ];

    return templates[Math.floor(Math.random() * templates.length)];
};

// ─────────────────────────────────────────────────────
// MAIN EXPORT: Full Discovery Pipeline
// ─────────────────────────────────────────────────────
const runDiscoveryPipeline = async (area, memory, friendVaults = {}, lat = null, lon = null) => {
    // 1. Build Taste Vector (local, private)
    console.log('🧠 Discovery: Building Taste Vector...');
    const tasteVector = buildTasteVector(memory, friendVaults);

    // 2. Scout Candidates (sanitized external call)
    const rawCandidates = await scoutCandidates(area, lat, lon);

    if (rawCandidates.length === 0) {
        return { success: false, message: `Couldn't find any restaurants near "${area}". Try a different area.` };
    }

    // 3. LLM Enrichment (names only — no private data)
    console.log('✨ Discovery: Enriching candidates with LLM...');
    const enrichedCandidates = await enrichCandidatesWithLLM(rawCandidates);

    // 4. Sovereign Filter (all private — runs locally)
    console.log('🛡️ Discovery: Running Sovereign Filter...');
    const top3 = sovereignFilter(enrichedCandidates, tasteVector);

    if (top3.length === 0) {
        return { success: false, message: `All nearby spots were filtered out by your preferences. Try a different area!` };
    }

    // 5. Build result cards with Silent Operator reasoning
    const discoveries = top3.map((spot, i) => ({
        id: `disc_${Date.now()}_${i}`,
        name: spot.name,
        cuisine: spot.inferredCuisine,
        vibe: (spot.inferredVibes || []).join(', '),
        area: area,
        lat: spot.lat,
        lon: spot.lon,
        website: spot.website,
        alignmentScore: spot.alignmentScore,
        isWildcard: spot.isWildcard || false,
        reasoning: buildSilentReasoning(spot, spot.isWildcard || false),
        discovery: true,
    }));

    return { success: true, discoveries, tasteVector };
};

// Kept for backward compatibility with existing /api/save pivot logic
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
