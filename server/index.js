const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Agent Skills
const { extractRestaurantData } = require('./skills/social_hunter');
const { discoverRestaurants, runDiscoveryPipeline } = require('./skills/discovery_agent');
const { getRecommendation } = require('./skills/taste_alchemist');
const { findBestRestaurant } = require('./skills/group_consensus');
const { getAmbientContext } = require('./skills/weather_service');
const { getProactiveTriggers, enforceVariety } = require('./skills/lifestyle_operator');
const { searchVault } = require('./skills/vault_search');
const { applyMoodToConstraints } = require('./skills/mood_profiles');
const { spawn } = require('child_process');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

app.use(cors());
app.use(bodyParser.json());

const MEMORY_PATH = path.join(__dirname, 'memory', 'food_memory.json');

// Helper to emit agent thoughts
const emitThought = (agent, action, message, data = {}) => {
    io.emit('agent_thought', {
        agent,
        action,
        message,
        timestamp: new Date().toISOString(),
        data
    });
};

// Helper to read memory
const readMemory = () => JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
const writeMemory = (data) => fs.writeFileSync(MEMORY_PATH, JSON.stringify(data, null, 2));

// --- API ROUTES ---

// 1. Get Memory (Dashboard)
app.get('/api/memory', (req, res) => {
    res.json(readMemory());
});

// 2. Save Restaurant (Social Hunter Trigger)
app.post('/api/save', async (req, res) => {
    const { text } = req.body;
    
    emitThought('Social Hunter', 'DISCOVERY', 'Processing raw input from Telegram...', { text });
    
    const extracted = await extractRestaurantData(text);
    
    // DATA INTEGRITY VALIDATION
    if (!extracted || !extracted.name || extracted.name === "Unknown") {
        if (extracted && extracted.area && extracted.area !== "Local" && extracted.area !== "Unknown") {
            emitThought('Social Hunter', 'PIVOT', `No specific restaurant found. Pivoting to Discovery Agent for area: ${extracted.area}`);
            const discoveredMsg = await discoverRestaurants(extracted.area);
            emitThought('Discovery Agent', 'COMPLETED', `Successfully discovered restaurants in ${extracted.area}`);
            return res.json({ success: true, isDiscovery: true, message: discoveredMsg });
        }

        emitThought('Social Hunter', 'VALIDATION_FAILED', 'No actionable restaurant data found in input.');
        const failMessage = extracted && extracted.error_msg 
            ? extracted.error_msg 
            : "I couldn't find a specific restaurant name or location in that post! Can you send me the name or a Google Maps link instead?";
        return res.json({ success: false, message: failMessage });
    }
    
    emitThought('Social Hunter', 'EXTRACTION', `Metadata extracted: ${extracted.name}`, extracted);
    
    const memory = readMemory();
    const newEntry = {
        id: (memory.restaurants.length + 1).toString(),
        ...extracted,
        saved_at: new Date().toISOString().split('T')[0],
        visited: false,
        rating: null
    };
    
    memory.restaurants.push(newEntry);
    writeMemory(memory);
    
    emitThought('Memory Node', 'PERSISTENCE', `Committed ${extracted.name} to sovereign food brain.`);
    
    res.json({ success: true, entry: newEntry });
});

// 3. Get Recommendation (Taste Alchemist Trigger)
app.post('/api/recommend', async (req, res) => {
    const { context } = req.body;
    const memory = readMemory();
    const result = await getRecommendation(memory, context);
    res.json(result);
});

// Helper to read multiple vaults
const readVault = (filename) => {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'memory', filename), 'utf8'));
    } catch (e) {
        return { restaurants: [], analytics: {}, craving_patterns: {} };
    }
};

const writeVault = (filename, data) => {
    fs.writeFileSync(path.join(__dirname, 'memory', filename), JSON.stringify(data, null, 2));
};

// 4. Resolve Group Conflict (Consensus Engine Trigger)
app.post('/api/group-decision', async (req, res) => {
    let { constraints, mood } = req.body;

    // Apply mood overrides if provided
    if (mood) {
        constraints = applyMoodToConstraints(constraints || {}, mood);
        emitThought('Lifestyle Operator', 'MOOD', `Applying "${mood}" mood profile to consensus weights.`);
    }

    // Inject live negative_preferences from vault into session constraints
    try {
        const myVault = readVault('food_memory.json');
        const recentNegPrefs = (myVault.negative_preferences || []).slice(-10);
        if (recentNegPrefs.length > 0) {
            constraints = { ...(constraints || {}), negative_preferences: recentNegPrefs };
            emitThought('Memory Node', 'FEEDBACK', `Injecting ${recentNegPrefs.length} negative feedback signals into this session.`);
        }
    } catch (e) {}

    emitThought('Taste Alchemist', 'SYNTHESIS', `Synthesizing preferences across Sovereign Vaults${mood ? ` [mood: ${mood}]` : ''}...`);

    const groupVaults = {
        "Akash": readVault('food_memory.json'),
        "Rohan": readVault('rohan_vault.json'),
        "Priya": readVault('priya_vault.json')
    };

    try {
        const result = await findBestRestaurant(groupVaults, constraints);
        
        emitThought('Group Consensus', 'TOPOLOGY', 'Preference Topology calculated.', result);
        
        // Phase 4: Sovereign Vault Feedback Loop
        // Update craving_patterns with 5-day cooldown for the chosen cuisines
        const bestOption = result.best_option;
        if (bestOption && bestOption.cuisine) {
            const cuisines = bestOption.cuisine.split(',').map(c => c.trim().toLowerCase());
            
            Object.keys(groupVaults).forEach(user => {
                const vault = groupVaults[user];
                if (!vault.craving_patterns) vault.craving_patterns = {};
                
                cuisines.forEach(c => {
                    vault.craving_patterns[c] = {
                        last_satisfied: new Date().toISOString(),
                        cooldown_days: 5
                    };
                });
                
                // Determine filename
                const filename = user === "Akash" ? "food_memory.json" : `${user.toLowerCase()}_vault.json`;
                writeVault(filename, vault);
            });
            emitThought('Memory Node', 'PERSISTENCE', `Updated Craving Cycles across all group vaults with 5-day cooldown for [${cuisines.join(', ')}]`);
        }
        
        setTimeout(() => {
            emitThought('Lifestyle Operator', 'ACTION', `Drafting decision poll for '${result.best_option.name}'`, {
                poll_text: `Dinner tonight?\n1. ${result.best_option.name}\n\n🤖 Reason: ${result.reasoning}`,
                target: 'Friday Night Group'
            });
        }, 1500);

        res.json(result);
    } catch (error) {
        emitThought('Group Consensus', 'ERROR', `Failed to calculate consensus: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Proactive Thinking (Lifestyle Operator Trigger)
app.post('/api/think', async (req, res) => {
    emitThought('Lifestyle Operator', 'ANALYSIS', 'Checking ambient context and food memory...');
    
    const weather = await getAmbientContext();
    emitThought('Lifestyle Operator', 'CONTEXT', `Weather detected: ${weather.condition} in ${weather.city}`, weather);
    
    const memory = readMemory();
    const triggers = getProactiveTriggers(memory, weather);
    
    if (triggers.length > 0) {
        emitThought('Lifestyle Operator', 'INSIGHT', `Generated ${triggers.length} proactive insights.`, triggers);
    } else {
        emitThought('Lifestyle Operator', 'ANALYSIS', 'No immediate proactive actions needed.');
    }
    
    res.json({ success: true, triggers });
});

// 5. Natural Language Vault Search
app.post('/api/search-vault', async (req, res) => {
    const { query } = req.body;
    emitThought('Taste Alchemist', 'SEARCH', `Querying Sovereign Vault for: "${query}"`);
    
    const memory = readVault('food_memory.json');
    const result = await searchVault(query, memory);
    
    res.json(result);
});

// 6. Phase 7: Discovery Pipeline
app.post('/api/discover', async (req, res) => {
    const { area, lat, lon } = req.body;
    if (!area && (!lat || !lon)) {
        return res.status(400).json({ success: false, message: 'Provide an area name or lat/lon coordinates.' });
    }

    emitThought('Discovery Agent', 'SCOUT', `Starting discovery pipeline for "${area || `${lat},${lon}`}"...`);

    const memory = readVault('food_memory.json');
    const friendVaults = {
        'Rohan': readVault('rohan_vault.json'),
        'Priya': readVault('priya_vault.json')
    };

    const result = await runDiscoveryPipeline(area || 'Bangalore', memory, friendVaults, lat, lon);

    if (result.success) {
        emitThought('Discovery Agent', 'COMPLETED', `Sovereign Filter returned ${result.discoveries.length} top discoveries.`);
    } else {
        emitThought('Discovery Agent', 'NO_MATCH', result.message);
    }

    res.json(result);
});

// 7. Save a Discovery to Vault
app.post('/api/save-discovery', (req, res) => {
    const { discovery } = req.body;
    if (!discovery || !discovery.name) {
        return res.status(400).json({ success: false, message: 'Invalid discovery data.' });
    }

    const memory = readVault('food_memory.json');
    const newEntry = {
        id: (memory.restaurants.length + 1).toString(),
        name: discovery.name,
        cuisine: discovery.cuisine || null,
        area: discovery.area || null,
        vibe: discovery.vibe || null,
        budget: null,
        meal_type: null,
        saved_at: new Date().toISOString().split('T')[0],
        visited: false,
        rating: null,
        discovery: true,  // Phase 7 tag
    };

    memory.restaurants.push(newEntry);
    writeMemory(memory);

    emitThought('Memory Node', 'PERSISTENCE', `Discovery saved: ${discovery.name} (tagged discovery:true)`);
    res.json({ success: true, entry: newEntry });
});

// 8. Phase 8: Vision-Based Visit Verification
const TMP_DIR = path.join(__dirname, 'tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

app.post('/api/verify-visit', async (req, res) => {
    const { imagePath } = req.body;
    if (!imagePath) return res.status(400).json({ success: false, error: 'imagePath required' });

    emitThought('Vision Engine', 'VERIFY', 'Running Gemini vision on photo for restaurant identification...');

    const pythonProcess = spawn('python3', [
        path.resolve(__dirname, 'python_services', 'visit_verifier.py')
    ]);

    let stdout = '';
    let stderr = '';
    pythonProcess.stdout.on('data', d => stdout += d.toString());
    pythonProcess.stderr.on('data', d => stderr += d.toString());

    pythonProcess.stdin.write(JSON.stringify({ image_path: imagePath }));
    pythonProcess.stdin.end();

    pythonProcess.on('close', (code) => {
        // Always clean up temp file
        try { if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath); } catch (e) {}

        try {
            const result = JSON.parse(stdout);

            if (result.error === 'GEMINI_503') {
                return res.json({ success: false, gemini_unavailable: true });
            }

            if (!result.success || !result.identified || result.confidence < 0.5) {
                return res.json({ success: false, identified: false, confidence: result.confidence || 0 });
            }

            // Fuzzy match against vault
            const memory = readVault('food_memory.json');
            const identified = result.restaurant_name.toLowerCase();
            const idx = memory.restaurants.findIndex(r => {
                const name = (r.name || '').toLowerCase();
                return name.includes(identified) || identified.includes(name) ||
                       identified.split(' ').filter(w => w.length > 3).some(w => name.includes(w));
            });

            if (idx === -1) {
                return res.json({ success: true, identified: true, restaurant_name: result.restaurant_name, matched_in_vault: false, confidence: result.confidence, cues: result.cues });
            }

            // Mark as visited + reset craving cycle
            memory.restaurants[idx].visited = true;
            const cuisine = memory.restaurants[idx].cuisine;
            if (cuisine) {
                const cuisines = cuisine.split(',').map(c => c.trim().toLowerCase());
                if (!memory.craving_patterns) memory.craving_patterns = {};
                cuisines.forEach(c => {
                    memory.craving_patterns[c] = { last_satisfied: new Date().toISOString(), cooldown_days: 5 };
                });
            }
            writeMemory(memory);
            emitThought('Memory Node', 'PERSISTENCE', `Marked "${memory.restaurants[idx].name}" as visited via photo verification.`);

            return res.json({ success: true, identified: true, matched_in_vault: true, restaurant: memory.restaurants[idx], confidence: result.confidence, cues: result.cues });
        } catch (e) {
            return res.status(500).json({ success: false, error: 'Failed to parse verifier output', raw: stdout });
        }
    });
});

// 9. Heartbeat (Agency Daemon — triggered from frontend)
app.post('/api/heartbeat', async (req, res) => {
    emitThought('Agency Daemon', 'WAKEUP', 'Heartbeat triggered from dashboard...');
    try {
        const memory = readVault('food_memory.json');
        const { triggers, timeVibe } = await getProactiveTriggers(memory);
        const penaltyMap = enforceVariety(memory.restaurants || []);

        const cravings = memory.craving_patterns || {};
        const now = new Date();
        let nudgeReasons = [];
        let forcedConstraints = { vetoes: [] };

        // Check craving cycles
        for (const [cuisine, data] of Object.entries(cravings)) {
            const lastHad = new Date(data.last_satisfied || data.last_had || new Date());
            const cycleDays = data.cooldown_days || 5;
            const daysSince = Math.ceil((now - lastHad) / (1000 * 60 * 60 * 24));
            if (daysSince >= cycleDays) {
                nudgeReasons.push(`🍛 ${cuisine} craving overdue by ${daysSince - cycleDays} day(s)`);
                if (!forcedConstraints.boosts) forcedConstraints.boosts = {};
                forcedConstraints.boosts[cuisine] = 5.0;
            }
        }

        // Add environmental triggers
        triggers.forEach(t => {
            nudgeReasons.push(t.message);
            if (t.tags) forcedConstraints.must_include_tags = t.tags;
        });

        // Apply variety penalties
        for (const [cuisine, penalty] of Object.entries(penaltyMap)) {
            if (!forcedConstraints.boosts) forcedConstraints.boosts = {};
            forcedConstraints.boosts[cuisine] = penalty;
        }

        emitThought('Agency Daemon', 'ANALYSIS', nudgeReasons.length > 0
            ? `Found ${nudgeReasons.length} active trigger(s).`
            : 'All cycles healthy. No intervention needed.');

        return res.json({
            success: true,
            nudgeReasons,
            timeVibe,
            triggerCount: nudgeReasons.length,
            message: nudgeReasons.length > 0
                ? `Found ${nudgeReasons.length} active trigger(s): ${nudgeReasons.join('; ')}`
                : 'All craving cycles healthy. No proactive nudges needed right now.'
        });
    } catch (err) {
        emitThought('Agency Daemon', 'ERROR', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 5001;
http.listen(PORT, () => {
    console.log(`CraveMap Brain running on port ${PORT}`);
});
