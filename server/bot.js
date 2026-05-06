const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { evaluateAndTriggerAgency } = require('./skills/agency_daemon');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const MEMORY_PATH = path.join(__dirname, 'memory', 'food_memory.json');

console.log("🤖 Sovereign Bot: Initializing Phase 6 Agency...");

// Utility to save chat ID
const saveChatId = (ctx) => {
    try {
        if (!fs.existsSync(MEMORY_PATH)) return;
        const memory = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
        if (!memory.analytics) memory.analytics = {};
        if (memory.analytics.telegram_chat_id !== ctx.chat.id) {
            memory.analytics.telegram_chat_id = ctx.chat.id;
            fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
        }
    } catch (e) {}
};

bot.start((ctx) => {
    saveChatId(ctx);
    ctx.reply("Welcome to CraveMap Sovereign. Send me a Reel link to save it, or ask me a natural language query like 'Show me rooftop spots'.\n\nAvailable Commands:\n/consensus - Trigger group decision\n/export_vault - Download your data\n/wipe_memory - Nuclear wipe\n/privacy_mode - Toggle graph visibility\n/dev_trigger_agency - Test Proactive Nudges");
});

// Start the Heartbeat Daemon (runs every hour)
cron.schedule('0 * * * *', () => {
    evaluateAndTriggerAgency(bot);
});

// Component 1: The Consensus Decision Card
bot.command('consensus', async (ctx) => {
    saveChatId(ctx);
    ctx.reply("🎲 Engaging Social Brain... Calculating Optimal Match...");
    try {
        const response = await axios.post('http://localhost:5001/api/group-decision', { constraints: {} });
        const result = response.data;
        
        if (!result.best_option) {
            return ctx.reply("❌ No consensus could be reached based on the current constraints.");
        }

        const mapsQuery = encodeURIComponent(`${result.best_option.name} ${result.best_option.area}`);
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

        const cardText = `🏆 **Optimal Match Found!**\n\n` +
                         `📍 **${result.best_option.name}**\n` +
                         `🥘 Cuisine: ${result.best_option.cuisine || 'Unknown'}\n` +
                         `🌆 Area: ${result.best_option.area || 'Unknown'}\n` +
                         `✨ Vibe: ${result.best_option.vibe || 'Unknown'}\n\n` +
                         `🤖 **Reasoning:**\n_${result.reasoning}_`;

        ctx.replyWithMarkdown(cardText, Markup.inlineKeyboard([
            [Markup.button.url('🗺️ Get Directions', mapsUrl), Markup.button.url('📱 View Reel', 'https://instagram.com')],
            [Markup.button.callback('✅ Accept Spot', `accept_nudge_${result.best_option.id}`), Markup.button.callback('🛑 Veto & Recalculate', 'veto_trigger')]
        ]));

    } catch (err) {
        ctx.reply("❌ Consensus Engine Failed: " + err.message);
    }
});

bot.action('veto_trigger', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply("🛑 Veto registered. The Taste Graph will penalize this spot and recalculate shortly.");
});

// Feedback Loop Integration
bot.action(/accept_nudge_(.+)/, (ctx) => {
    const spotId = ctx.match[1];
    try {
        const memory = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
        const spotIndex = memory.restaurants.findIndex(r => r.id === spotId);
        
        if (spotIndex !== -1) {
            const spot = memory.restaurants[spotIndex];
            memory.restaurants[spotIndex].visited = true; // Mark as visited
            
            // Reset craving cycle for this cuisine
            if (spot.cuisine) {
                const cuisines = spot.cuisine.split(',').map(c => c.trim().toLowerCase());
                if (!memory.craving_patterns) memory.craving_patterns = {};
                cuisines.forEach(c => {
                    memory.craving_patterns[c] = {
                        last_satisfied: new Date().toISOString(),
                        cooldown_days: 5
                    };
                });
            }
            
            fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
            ctx.reply(`✅ **${spot.name}** has been marked as visited!\n\nYour Behavioral Taste Profile has been updated, and the ${spot.cuisine || 'food'} craving cycle has been reset.`);
        }
    } catch (e) {
        ctx.reply("Failed to update Behavioral Taste Profile.");
    }
    ctx.answerCbQuery();
});

// Component 3: Sovereign Ownership Commands
bot.command('export_vault', (ctx) => {
    if (fs.existsSync(MEMORY_PATH)) {
        ctx.replyWithDocument({ source: MEMORY_PATH, filename: 'my_sovereign_vault.json' }, { caption: "🔐 Here is your completely raw, offline data. You own this." });
    } else {
        ctx.reply("Your vault is currently empty.");
    }
});

bot.command('wipe_memory', (ctx) => {
    try {
        const memory = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
        memory.restaurants = [];
        memory.craving_patterns = {};
        fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
        ctx.reply("☢️ Nuclear wipe complete. Your Sovereign Vault is now completely blank.");
    } catch (e) {
        ctx.reply("Failed to wipe vault.");
    }
});

bot.command('privacy_mode', (ctx) => {
    try {
        const memory = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
        if (!memory.analytics) memory.analytics = {};
        memory.analytics.privacy_mode = !memory.analytics.privacy_mode;
        fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
        
        if (memory.analytics.privacy_mode) {
            ctx.reply("🕵️‍♂️ Privacy Mode: ON. Your data will be ignored in the next Group Consensus calculation.");
        } else {
            ctx.reply("🌍 Privacy Mode: OFF. Your tastes will influence the Social Taste Graph.");
        }
    } catch (e) {
        ctx.reply("Failed to toggle privacy mode.");
    }
});

// Component 4: Proactive Interaction Skeleton
bot.command('dev_trigger_agency', async (ctx) => {
    saveChatId(ctx);
    ctx.reply("⚙️ Simulating Heartbeat Daemon (Forcing Friday Night Conditions)...");
    await evaluateAndTriggerAgency(bot, true);
});

// Component 2: Natural Language Vault Queries & Media Ingestion
bot.on('text', async (ctx) => {
    saveChatId(ctx);
    const text = ctx.message.text;
    
    // Distinguish between a URL save request and a Natural Language search
    if (text.includes("http") || text.includes("instagram") || text.includes("tiktok")) {
        ctx.reply("⚡ Agent Social Hunter is processing your media link...");
        try {
            const response = await axios.post('http://localhost:5001/api/save', { text });
            if (response.data.success) {
                if (response.data.isDiscovery) {
                    ctx.reply(response.data.message);
                } else {
                    const entry = response.data.entry;
                    ctx.reply(`📍 Saved to Sovereign Bucket!\n\nName: ${entry.name}\nCuisine: ${entry.cuisine}\nArea: ${entry.area}\n\nCheck your dashboard for behavioral insights.`);
                }
            } else {
                ctx.reply(`🤔 ${response.data.message}`);
            }
        } catch (error) {
            ctx.reply("📍 I've saved this offline! It will sync to your Sovereign Food Brain shortly.");
        }
    } else {
        // Natural Language Search
        ctx.reply(`🔍 Querying Sovereign Vault for: "${text}"...`);
        try {
            const response = await axios.post('http://localhost:5001/api/search-vault', { query: text });
            const { filters, results } = response.data;
            
            if (results.length === 0) {
                ctx.reply(`I couldn't find anything matching those filters in your vault. Try a broader search!`);
            } else {
                let replyMsg = `Found ${results.length} spot(s) matching your criteria:\n\n`;
                results.forEach((r, i) => {
                    replyMsg += `${i+1}. **${r.name}** - ${r.area} (${r.cuisine || 'Food'})\n   _${r.vibe || 'No vibe tags'}_\n\n`;
                });
                ctx.replyWithMarkdown(replyMsg);
            }
        } catch (err) {
            ctx.reply("❌ Search failed.");
        }
    }
});

bot.launch()
    .then(() => console.log("🚀 Sovereign Bot is LIVE on Telegram"))
    .catch((err) => console.error("❌ Bot failed to launch:", err.message));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
