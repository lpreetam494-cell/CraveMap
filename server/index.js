const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Agent Skills
const { extractRestaurantData } = require('./skills/social_hunter');
const { getRecommendation } = require('./skills/taste_alchemist');
const { findBestRestaurant } = require('./skills/group_consensus');
const { getAmbientContext } = require('./skills/weather_service');
const { getProactiveTriggers } = require('./skills/lifestyle_operator');

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
app.post('/api/recommend', (req, res) => {
    const { context } = req.body;
    const memory = readMemory();
    const result = getRecommendation(memory, context);
    res.json(result);
});

// 4. Resolve Group Conflict (Consensus Engine Trigger)
app.post('/api/group-decision', (req, res) => {
    const { groupPrefs } = req.body;
    
    emitThought('Taste Alchemist', 'SYNTHESIS', `Synthesizing preferences for group...`);
    
    const memory = readMemory();
    const result = findBestRestaurant(memory.restaurants, groupPrefs);
    
    emitThought('Group Consensus', 'TOPOLOGY', 'Preference Topology calculated.', result.topology);
    
    setTimeout(() => {
        emitThought('Lifestyle Operator', 'ACTION', `Drafting decision poll for '${result.best_option.name}'`, {
            poll_text: `Dinner tonight? 1. ${result.best_option.name} 2. Backup: Kintaro Ramen`,
            target: 'Friday Night Group'
        });
    }, 1500);

    res.json(result);
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

const PORT = 5000;
http.listen(PORT, () => {
    console.log(`CraveMap Brain running on port ${PORT}`);
});
