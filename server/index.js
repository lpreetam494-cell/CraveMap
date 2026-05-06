const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Agent Skills
const { extractRestaurantData } = require('./skills/social_hunter');
const { discoverRestaurants } = require('./skills/discovery_agent');
const { getRecommendation } = require('./skills/taste_alchemist');
const { findBestRestaurant } = require('./skills/group_consensus');
const { getAmbientContext } = require('./skills/weather_service');
const { getProactiveTriggers } = require('./skills/lifestyle_operator');
const { searchVault } = require('./skills/vault_search');

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
    const { constraints } = req.body; // e.g. { vetoes: ["pizza"], max_budget: 1000 }
    
    emitThought('Taste Alchemist', 'SYNTHESIS', `Synthesizing preferences across Sovereign Vaults...`);
    
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

const PORT = process.env.PORT || 5001;
http.listen(PORT, () => {
    console.log(`CraveMap Brain running on port ${PORT}`);
});
