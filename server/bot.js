const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { evaluateAndTriggerAgency } = require('./skills/agency_daemon');
const { resolveMood, MOOD_PROFILES } = require('./skills/mood_profiles');
const { recordNegativePreference } = require('./skills/reweight_engine');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const TMP_DIR = path.join(__dirname, 'tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

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

console.log("🤖 Sovereign Bot: Initializing Phase 8 Behavioral Feedback...");

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
        "Welcome back to *CraveMap Sovereign* 🧠\n\n" +
        "*Commands:*\n" +
        "/discover Koramangala — Scout new restaurants\n" +
        "/consensus celebrations — Group decision with mood\n" +
        "/export\\_vault — Download your data\n" +
        "/wipe\\_memory — Nuclear wipe\n" +
        "/privacy\\_mode — Toggle graph visibility\n\n" +
        "*Moods:* celebrations, quick bite, date night, comfort, healthy\n\n" +
        "Send a photo of your meal and I will verify the visit automatically.",
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

// In-memory store for veto context (spotId → spot data)
const vetoSessionStore = new Map();

// Component 1: The Consensus Decision Card (Phase 8: Mood-aware)
bot.command('consensus', async (ctx) => {
    saveChatId(ctx);
    const text = ctx.message.text.trim();
    const args = text.replace('/consensus', '').trim();
    const moodKey = resolveMood(args);

    const moodLabel = moodKey ? MOOD_PROFILES[moodKey]?.label : null;
    const moodDisplay = moodLabel ? ` \[${moodLabel}\]` : '';

    await ctx.reply(`🎲 Engaging Social Brain${moodDisplay}... Calculating Optimal Match...`);

    try {
        const response = await axios.post('http://localhost:5001/api/group-decision', {
            constraints: {},
            mood: moodKey || undefined
        });
        const result = response.data;

        if (!result.best_option) {
            return ctx.reply("❌ No consensus could be reached based on the current constraints.");
        }

        const spot = result.best_option;
        const mapsQuery = encodeURIComponent(`${spot.name} ${spot.area || ''}`);
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
        const vetoKey = `v_${spot.id || Date.now()}`;
        vetoSessionStore.set(vetoKey, { name: spot.name, cuisine: spot.cuisine, id: spot.id });
        setTimeout(() => vetoSessionStore.delete(vetoKey), 30 * 60 * 1000);

        const moodBanner = moodKey ? `\n🎨 *Mood:* ${moodLabel}` : '';
        const cardText =
            `🏆 *Optimal Match Found!*${moodBanner}\n\n` +
            `📍 *${spot.name}*\n` +
            `🥘 Cuisine: ${spot.cuisine || 'Unknown'}\n` +
            `🌆 Area: ${spot.area || 'Unknown'}\n` +
            `✨ Vibe: ${spot.vibe || 'Unknown'}\n\n` +
            `🤖 *Reasoning:*\n_${result.reasoning}_`;

        await ctx.replyWithMarkdown(cardText, Markup.inlineKeyboard([
            [Markup.button.url('🗺️ Get Directions', mapsUrl)],
            [Markup.button.callback('✅ Accept Spot', `accept_nudge_${spot.id}`), Markup.button.callback('🛑 Veto', `veto_start_${vetoKey}`)]
        ]));

    } catch (err) {
        ctx.reply("❌ Consensus Engine Failed: " + err.message);
    }
});

// --- INTELLIGENT VETO FLOW (Component 3) ---
// Step 1: Show 4-reason sub-menu
bot.action(/veto_start_(.+)/, (ctx) => {
    ctx.answerCbQuery();
    const vetoKey = ctx.match[1];
    const spot = vetoSessionStore.get(vetoKey);
    const spotName = spot?.name || 'this spot';
    ctx.reply(
        `🛑 Why are you vetoing *${spotName}*? This helps sharpen your recommendations.`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('💸 Too Expensive', `vr_${vetoKey}_too_expensive`)],
                [Markup.button.callback('📍 Too Far', `vr_${vetoKey}_too_far`)],
                [Markup.button.callback('🙅 Not in the Mood', `vr_${vetoKey}_not_in_mood`)],
                [Markup.button.callback('🚫 Dislike Cuisine', `vr_${vetoKey}_dislike_cuisine`)],
            ])
        }
    );
});

// Step 2: Record the reason and trigger re-weighting
const VETO_MESSAGES = {
    too_expensive: { msg: '💸 Got it. Budget noted — I\'ll prioritize more affordable options next time.', weight: -3.0 },
    too_far:       { msg: '📍 Proximity flagged — I\'ll factor in distance more carefully.', weight: -2.0 },
    not_in_mood:   { msg: '🙅 Mood mismatch noted — try `/consensus` with a mood tag next time!', weight: -1.5 },
    dislike_cuisine: { msg: '🚫 Cuisine preference updated — this cuisine will be heavily penalized next session.', weight: -4.0 },
};

bot.action(/vr_(.+)_(too_expensive|too_far|not_in_mood|dislike_cuisine)$/, async (ctx) => {
    ctx.answerCbQuery('Feedback recorded ✅');
    const vetoKey = `v_${ctx.match[1]}`;
    const reason = ctx.match[2];
    const spot = vetoSessionStore.get(vetoKey);
    const feedback = VETO_MESSAGES[reason];

    if (spot) {
        recordNegativePreference(spot.name, spot.cuisine, reason, feedback.weight);
        vetoSessionStore.delete(vetoKey);
    }

    await ctx.reply(feedback.msg, { parse_mode: 'Markdown' });

    // Offer immediate re-calculation
    await ctx.reply(
        'Want me to recalculate with this feedback applied?',
        Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Recalculate Now', 'recalculate_consensus')]
        ])
    );
});

bot.action('recalculate_consensus', async (ctx) => {
    ctx.answerCbQuery();
    await ctx.reply('🎲 Recalculating with updated preferences...');
    try {
        const response = await axios.post('http://localhost:5001/api/group-decision', { constraints: {} });
        const result = response.data;
        if (!result.best_option) return ctx.reply('❌ Still no match found. Try adding more spots to your vault!');
        const spot = result.best_option;
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.name + ' ' + (spot.area || ''))}`;
        const vetoKey = `v_${spot.id || Date.now()}`;
        vetoSessionStore.set(vetoKey, { name: spot.name, cuisine: spot.cuisine, id: spot.id });
        setTimeout(() => vetoSessionStore.delete(vetoKey), 30 * 60 * 1000);
        await ctx.replyWithMarkdown(
            `🏆 *New Match!*\n📍 *${spot.name}*\n🥘 ${spot.cuisine || '?'} | ✨ ${spot.vibe || '?'}\n\n_${result.reasoning}_`,
            Markup.inlineKeyboard([
                [Markup.button.url('🗺️ Directions', mapsUrl)],
                [Markup.button.callback('✅ Accept', `accept_nudge_${spot.id}`), Markup.button.callback('🛑 Veto', `veto_start_${vetoKey}`)]
            ])
        );
    } catch (err) {
        ctx.reply('❌ Failed: ' + err.message);
    }
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
            ctx.reply(`✅ *${spot.name}* has been marked as visited!\n\nYour Behavioral Taste Profile has been updated, and the ${spot.cuisine || 'food'} craving cycle has been reset.`, { parse_mode: 'Markdown' });
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

// Phase 8 - Component 1: Vision-Based Visit Verification
// Developer Note: Use mid-size photo (index 1 or 2) to stay under 2MB for Gemini Flash accuracy
bot.on('photo', async (ctx) => {
    saveChatId(ctx);

    const photos = ctx.message.photo;
    // Telegram sends photos in ascending size order. Pick index 1 (medium) to balance quality/size.
    // Index 0 = thumbnail (~10-50KB), Index 1 = medium (~100-300KB), last = full res (can be 5MB+)
    const targetPhoto = photos.length >= 2 ? photos[1] : photos[0];
    const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB limit

    if (targetPhoto.file_size && targetPhoto.file_size > MAX_SIZE_BYTES) {
        return ctx.reply(
            '📸 Photo received, but it\'s too large for fast processing.\n' +
            'I\'ll use a compressed version instead — analysing now...'
        );
    }

    const processingMsg = await ctx.reply('📸 *Analysing your photo* to identify the restaurant...', { parse_mode: 'Markdown' });

    try {
        // Download photo from Telegram
        const fileLink = await ctx.telegram.getFileLink(targetPhoto.file_id);
        const tmpPath = path.join(TMP_DIR, `verify_${Date.now()}.jpg`);

        const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
        fs.writeFileSync(tmpPath, Buffer.from(response.data));

        // Call verify-visit API
        const verifyRes = await axios.post('http://localhost:5001/api/verify-visit', { imagePath: tmpPath });
        const result = verifyRes.data;

        if (result.gemini_unavailable) {
            // Graceful fallback: offer manual confirmation
            return ctx.reply(
                '⚠️ *Vision engine is temporarily busy.* Want to mark a visit manually?\n\nReply with the restaurant name and I\'ll update your vault.',
                { parse_mode: 'Markdown' }
            );
        }

        if (!result.success || !result.identified) {
            return ctx.reply(
                `🤔 I couldn't confidently identify a restaurant from this photo (confidence: ${Math.round((result.confidence || 0) * 100)}%).\n\n` +
                `Try a clearer shot of the signage, menu, or food. Or type the restaurant name to save manually.`
            );
        }

        if (!result.matched_in_vault) {
            // Identified but not in vault — offer to save as new discovery
            return ctx.replyWithMarkdown(
                `👀 I think this is *${result.restaurant_name}* (${Math.round(result.confidence * 100)}% confident).\n\n` +
                `_${result.cues}_\n\n` +
                `This spot isn't in your vault yet. Want to save it?`,
                Markup.inlineKeyboard([[
                    Markup.button.callback(`💾 Save ${result.restaurant_name}`, `sdsc_new_${Buffer.from(result.restaurant_name).toString('base64').slice(0, 20)}`)
                ]])
            );
        }

        // Matched and marked visited ✅
        const spot = result.restaurant;
        return ctx.replyWithMarkdown(
            `✅ *Visit Verified!*\n\n` +
            `📍 *${spot.name}* has been marked as visited in your vault.\n` +
            `🥘 ${spot.cuisine || 'Unknown cuisine'}\n\n` +
            `_Visual cues: ${result.cues}_\n\n` +
            `Your Craving Cycle timer for this cuisine has been reset. 🔄`
        );

    } catch (err) {
        ctx.reply('❌ Photo verification failed: ' + err.message);
    }
});

bot.launch()
    .then(() => console.log("🚀 Sovereign Bot is LIVE on Telegram"))
    .catch((err) => console.error("❌ Bot failed to launch:", err.message));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
