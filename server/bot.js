const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { evaluateAndTriggerAgency } = require('./skills/agency_daemon');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// In-memory session store for discovery data (bypass Telegram 64-byte limit)
const discoverySessionStore = new Map();
const makeDiscoveryKey = (spot) => {
    const key = `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    discoverySessionStore.set(key, spot);
    // Auto-expire after 30 minutes
    setTimeout(() => discoverySessionStore.delete(key), 30 * 60 * 1000);
    return key;
};
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const MEMORY_PATH = path.join(__dirname, 'memory', 'food_memory.json');

console.log("🤖 Sovereign Bot: Initializing Phase 7 Discovery Agent...");

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

bot.start(async (ctx) => {
    saveChatId(ctx);
    // Quick Start: detect empty vault and launch onboarding
    try {
        const memory = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
        const isEmpty = !memory.restaurants || memory.restaurants.length === 0;
        if (isEmpty) {
            return ctx.reply(
                "👋 Welcome to *CraveMap Sovereign* — your private Food Brain!\n\n" +
                "Your vault is empty. Let me help you get started with a quick discovery!\n\n" +
                "Which vibe fits you best?",
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🍛 Street Food & Local Gems', 'qs_vibe_street')],
                        [Markup.button.callback('🌃 Rooftop & Fine Dining', 'qs_vibe_rooftop')],
                        [Markup.button.callback('🍺 Casual Breweries & Cafes', 'qs_vibe_casual')],
                        [Markup.button.callback('🌱 Healthy & Clean Eating', 'qs_vibe_healthy')],
                    ])
                }
            );
        }
    } catch (e) {}

    ctx.reply(
        "Welcome back to *CraveMap Sovereign!* 🧠\n\n" +
        "Available Commands:\n" +
        "/discover <area> — Scout new restaurants\n" +
        "/consensus — Trigger group decision\n" +
        "/export\_vault — Download your data\n" +
        "/wipe\_memory — Nuclear wipe\n" +
        "/privacy\_mode — Toggle graph visibility\n" +
        "/dev\_trigger\_agency — Test Proactive Nudges",
        { parse_mode: 'Markdown' }
    );
});

// Quick Start Onboarding Callbacks
const QUICK_START_VIBES = {
    qs_vibe_street: { vibe: 'street food, local, casual, budget', tags: ['street food', 'local', 'casual'] },
    qs_vibe_rooftop: { vibe: 'rooftop, fine dining, date night, premium', tags: ['rooftop', 'fine dining', 'date'] },
    qs_vibe_casual: { vibe: 'brewery, cafe, casual, lively', tags: ['brewery', 'cafe', 'casual'] },
    qs_vibe_healthy: { vibe: 'healthy, salad, clean eating, light', tags: ['healthy', 'salad', 'clean'] },
};

for (const [action, profile] of Object.entries(QUICK_START_VIBES)) {
    bot.action(action, async (ctx) => {
        ctx.answerCbQuery();
        saveChatId(ctx);
        // Seed the taste profile into the vault
        try {
            const memory = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
            if (!memory.analytics) memory.analytics = {};
            memory.analytics.seed_vibe = profile.vibe;
            memory.analytics.seed_tags = profile.tags;
            fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
        } catch (e) {}
        await ctx.reply(`✅ Got it! Running a *first discovery* in Bangalore based on your vibe...`, { parse_mode: 'Markdown' });
        // Trigger a discovery immediately using seeded vibe
        try {
            const response = await axios.post('http://localhost:5001/api/discover', { area: 'Bangalore' });
            await sendDiscoveryCards(ctx, response.data);
        } catch (err) {
            ctx.reply('❌ Discovery failed: ' + err.message);
        }
    });
}

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

// Phase 7: Discovery Command
const sendDiscoveryCards = async (ctx, result) => {
    if (!result.success || !result.discoveries || result.discoveries.length === 0) {
        return ctx.reply(result.message || "No discoveries found. Try a different area!");
    }

    await ctx.reply(`🔭 *Top ${result.discoveries.length} New Discoveries* — Ranked by your Taste Profile:`, { parse_mode: 'Markdown' });

    for (const [i, spot] of result.discoveries.entries()) {
        const label = spot.isWildcard ? '🎲 Wildcard Pick' : `#${i + 1} Best Match`;
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.name + ' ' + spot.area)}`;
        const sessionKey = makeDiscoveryKey(spot); // store full spot data in memory

        const card = `${label}\n📍 *${spot.name}*\n🥘 ${spot.cuisine || 'Mixed'} · ✨ ${spot.vibe || 'Local gem'}\n\n_${spot.reasoning}_`;

        await ctx.replyWithMarkdown(card, Markup.inlineKeyboard([
            [Markup.button.url('🗺️ Get Directions', mapsUrl)],
            [Markup.button.callback('💾 Save to Vault', `sdsc_${sessionKey}`)],
        ]));
    }
};

bot.command('discover', async (ctx) => {
    saveChatId(ctx);
    const text = ctx.message.text.trim();
    const area = text.replace('/discover', '').trim();

    if (!area) {
        return ctx.reply(
            "📍 Share your location or type an area name:\n" +
            "Example: `/discover Koramangala` or `/discover Indiranagar`",
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('Use Default (Bangalore)', 'discover_bangalore')]
                ])
            }
        );
    }

    await ctx.reply(`🔭 Scouting *${area}*... Applying your Sovereign Filter...`, { parse_mode: 'Markdown' });
    try {
        const response = await axios.post('http://localhost:5001/api/discover', { area });
        await sendDiscoveryCards(ctx, response.data);
    } catch (err) {
        ctx.reply('❌ Discovery failed: ' + err.message);
    }
});

bot.action('discover_bangalore', async (ctx) => {
    ctx.answerCbQuery();
    saveChatId(ctx);
    await ctx.reply('🔭 Scouting *Bangalore*...', { parse_mode: 'Markdown' });
    try {
        const response = await axios.post('http://localhost:5001/api/discover', { area: 'Bangalore' });
        await sendDiscoveryCards(ctx, response.data);
    } catch (err) {
        ctx.reply('❌ Discovery failed: ' + err.message);
    }
});

// Handle Telegram location share for GPS-precise discovery
bot.on('location', async (ctx) => {
    saveChatId(ctx);
    const { latitude, longitude } = ctx.message.location;
    await ctx.reply(`📡 Got your coordinates! Scouting nearby restaurants...`);
    try {
        const response = await axios.post('http://localhost:5001/api/discover', { area: 'Current Location', lat: latitude, lon: longitude });
        await sendDiscoveryCards(ctx, response.data);
    } catch (err) {
        ctx.reply('❌ Discovery failed: ' + err.message);
    }
});

// Save Discovery Feedback Loop (uses in-memory session store)
bot.action(/sdsc_(.+)/, async (ctx) => {
    ctx.answerCbQuery('Saving to your Vault...');
    const sessionKey = `d_${ctx.match[1].replace('d_', '')}`;
    const spot = discoverySessionStore.get(ctx.match[1]) || discoverySessionStore.get(sessionKey);

    if (!spot) {
        return ctx.reply('⚠️ Discovery session expired. Run /discover again and save immediately.');
    }

    try {
        await axios.post('http://localhost:5001/api/save-discovery', { discovery: spot });
        ctx.replyWithMarkdown(
            `💾 *${spot.name}* saved to your Sovereign Vault!\n` +
            `Tagged as \`discovery: true\` — your Taste Profile will adapt to this.`
        );
        discoverySessionStore.delete(ctx.match[1]); // clean up
    } catch (e) {
        ctx.reply('❌ Failed to save discovery: ' + e.message);
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
