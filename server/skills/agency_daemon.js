const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getProactiveTriggers, enforceVariety } = require('./lifestyle_operator');

const MEMORY_PATH = path.join(__dirname, '..', 'memory', 'food_memory.json');

const evaluateAndTriggerAgency = async (bot, forceTest = false) => {
    console.log("🕒 Agency Daemon: Waking up to evaluate state...");
    if (!fs.existsSync(MEMORY_PATH)) return;

    const memory = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
    const chatId = memory.analytics?.telegram_chat_id;
    
    if (!chatId) {
        console.log("🕒 Agency Daemon: No Telegram Chat ID linked. Sleeping.");
        return;
    }

    try {
        // 1. Gather Context
        let { weather, triggers, timeVibe } = await getProactiveTriggers(memory);
        const penaltyMap = enforceVariety(memory.restaurants || []);
        
        let nudgeReason = null;
        let forcedConstraints = { vetoes: [] };

        // IF DEV TEST: Force Friday Night conditions if no other triggers exist
        if (forceTest) {
            console.log("🛠️ Dev Mode: Forcing Friday Night simulation.");
            timeVibe = 'friday_night';
            if (triggers.length === 0) {
                triggers.push({
                    type: 'TIME_CONTEXT',
                    message: "It's Friday night! Suggesting lively places, breweries, or nice dinners.",
                    tags: ['lively', 'brewery', 'date', 'rooftop', 'weekend']
                });
            }
        }

        // 2. Check Craving Cycles
        const now = new Date();
        const cravings = memory.craving_patterns || {};
        for (const [cuisine, data] of Object.entries(cravings)) {
            const lastHad = new Date(data.last_satisfied || data.last_had || new Date());
            const cycleDays = data.cooldown_days || 5;
            const daysSince = Math.ceil((now - lastHad) / (1000 * 60 * 60 * 24));
            
            if (daysSince >= cycleDays) {
                nudgeReason = `🍛 Your ${cuisine} cycle is strictly overdue (${daysSince} days)!`;
                if (!forcedConstraints.boosts) forcedConstraints.boosts = {};
                forcedConstraints.boosts[cuisine] = 5.0; 
                break; 
            }
        }

        // 3. Process Environmental Triggers
        if (triggers.length > 0) {
            const t = triggers[0]; 
            if (!nudgeReason) nudgeReason = t.message;
            if (t.tags) {
                forcedConstraints.must_include_tags = t.tags;
            }
        }

        // Apply Variety Penalties
        for (const [cuisine, penalty] of Object.entries(penaltyMap)) {
            if (!forcedConstraints.boosts) forcedConstraints.boosts = {};
            forcedConstraints.boosts[cuisine] = penalty; 
            if (!nudgeReason) nudgeReason = `To prevent taste fatigue (you've had lots of ${cuisine} lately), I'm suggesting something different.`;
        }

        // If no active trigger, go back to sleep
        if (!nudgeReason && timeVibe !== 'friday_night') {
            console.log("🕒 Agency Daemon: Conditions normal. No proactive intervention needed.");
            if (forceTest) {
                await bot.telegram.sendMessage(chatId, "🕒 Agency Daemon: All cycles are healthy, weather is normal, and it's not mealtime. No proactive nudges needed right now!");
            }
            return;
        }

        console.log("🚨 Agency Daemon: Triggering Proactive Nudge! Reason:", nudgeReason);

        // 4. Trigger Social Brain
        const response = await axios.post('http://localhost:5001/api/group-decision', { constraints: forcedConstraints });
        const result = response.data;

        if (!result.best_option) {
            console.log("🕒 Agency Daemon: Could not find a matching option in the vault. Aborting nudge.");
            if (forceTest) {
                await bot.telegram.sendMessage(chatId, "🕒 Agency Daemon: I wanted to send a nudge, but couldn't find a matching restaurant in your vault!");
            }
            return;
        }

        // 5. Dispatch Telegram Message
        const spot = result.best_option;
        const msg = `⚡ **Proactive Nudge from your Sovereign Brain**\n\n` +
                    `${nudgeReason}\n\n` +
                    `📍 **${spot.name}**\n` +
                    `🥘 Cuisine: ${spot.cuisine || 'Unknown'}\n` +
                    `✨ Vibe: ${spot.vibe || 'Unknown'}\n\n` +
                    `🤖 **Reasoning:**\n_${result.reasoning}_`;

        const mapsQuery = encodeURIComponent(`${spot.name} ${spot.area || ''}`);
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

        const inlineKeyboard = {
            inline_keyboard: [
                [{ text: '🗺️ Get Directions', url: mapsUrl }, { text: '✅ Accept Spot', callback_data: `accept_nudge_${spot.id}` }],
                [{ text: '🛑 Veto', callback_data: 'veto_trigger' }]
            ]
        };

        await bot.telegram.sendMessage(chatId, msg, { parse_mode: 'Markdown', reply_markup: inlineKeyboard });
        console.log("✅ Proactive Nudge dispatched!");

    } catch (err) {
        console.error("❌ Agency Daemon Error:", err.message);
    }
};

module.exports = { evaluateAndTriggerAgency };
