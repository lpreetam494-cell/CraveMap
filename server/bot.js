const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { evaluateAndTriggerAgency } = require('./skills/agency_daemon');
const { resolveMood, MOOD_PROFILES } = require('./skills/mood_profiles');
const { recordNegativePreference } = require('./skills/reweight_engine');
const onboarding = require('./skills/onboarding');
const lobby_manager = require('./skills/lobby_manager');
const { readUserVault, writeUserVault } = require('./skills/vault_router');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Secure backend communication
axios.interceptors.request.use(config => {
    if (config.url && config.url.includes('localhost:5001')) {
        config.headers['X-API-KEY'] = process.env.INTERNAL_API_SECRET;
    }
    return config;
});

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
// Dynamic vault path helper — no hardcoded food_memory.json
const { readUserVault: _readVault, writeUserVault: _writeVault } = require('./skills/vault_router');

console.log("🤖 Sovereign Bot: Initializing Phase 8 Behavioral Feedback...");

// Utility to save chat ID to the user's own vault
const saveChatId = async (ctx) => {
    try {
        const userId = ctx.from?.id;
        if (!userId) return;
        const memory = await _readVault(userId);
        if (!memory) return;
        if (!memory.analytics) memory.analytics = {};
        if (memory.analytics.telegram_chat_id !== ctx.chat.id) {
            memory.analytics.telegram_chat_id = ctx.chat.id;
            await _writeVault(userId, memory);
        }
    } catch (e) {}
};

// Helper to resolve city from a user's vault profile (fallback: 'Bangalore')
const getUserCity = async (userId) => {
    try {
        const vault = await _readVault(userId);
        return vault?.user_profile?.city || 'Bangalore';
    } catch (e) {
        return 'Bangalore';
    }
};

bot.use((ctx, next) => {
    console.log("➡️ Received Update:", ctx.updateType, ctx.message?.text);
    return next();
});

bot.start(async (ctx) => {
    saveChatId(ctx);
    const userId = ctx.from.id;
    let name = "Foodie";
    try {
        const vault = await readUserVault(userId);
        if (!vault.user_profile || !vault.user_profile.onboarding_complete) {
            // Check if name is already populated (e.g. from a wiped vault profile)
            if (vault.user_profile && vault.user_profile.name && !vault.user_profile.awaiting_name_input) {
                const onboarding = require('./skills/onboarding');
                return onboarding.askDietType(ctx, vault.user_profile.name);
            }
            return onboarding.startOnboarding(ctx);
        }
        if (vault.user_profile.name) {
            name = vault.user_profile.name;
        }
    } catch (e) {}

    ctx.reply(
        `Welcome back, *${name}* to *CraveMap Sovereign* 🧠\n\n` +
        `*Commands:*\n` +
        `/whoami — View your Food Persona\n` +
        `/discover Koramangala — Scout new restaurants\n` +
        `/consensus — Group decision lobby\n` +
        `/export\\_vault — Download your data\n` +
        `/wipe\\_memory — Nuclear wipe\n\n` +
        `Send a photo of your meal and I will verify the visit automatically.`,
        { parse_mode: 'Markdown' }
    );
});

// Dynamic Web Scout Enrichment via Groq LLM
const enrichWebScoutRestaurant = async (name, address) => {
    try {
        if (!process.env.GROQ_API_KEY) {
            return { cuisine: 'Mixed', vibe: 'Local gem' };
        }
        const Groq = require('groq-sdk');
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You are a restaurant data enricher. For the given restaurant name and address, infer the most likely cuisine type and a short list of vibe/atmosphere tags.
Return JSON format: {"cuisine": "string", "vibe": "string of 2-3 tags separated by commas"}`
                },
                {
                    role: 'user',
                    content: `Restaurant Name: "${name}"\nAddress: "${address}"`
                }
            ],
            temperature: 0.1,
            max_tokens: 300
        });
        const result = JSON.parse(completion.choices[0].message.content);
        return {
            cuisine: result.cuisine || 'Mixed',
            vibe: result.vibe || 'Local gem'
        };
    } catch (e) {
        console.error("Failed to enrich restaurant with LLM:", e.message);
        return { cuisine: 'Mixed', vibe: 'Local gem' };
    }
};

// --- WEB SEARCH SAFETY NET ACTION ---
bot.action(/add_search_spot_(.+)/, async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const sessionKey = ctx.match[1];
        const spotObj = discoverySessionStore.get(sessionKey);
        
        if (!spotObj) {
            return ctx.reply("❌ This search result has expired. Please search again!");
        }
        
        const userId = ctx.from.id;
        const { readUserVault, writeUserVault } = require('./skills/vault_router');
        const vault = await readUserVault(userId);
        
        // Notify user about intelligence parsing
        const waitMsg = await ctx.reply("🧠 *Sovereign Intelligence:* Inferring cuisine and vibe tags for your vault...");
        const enrichment = await enrichWebScoutRestaurant(spotObj.name, spotObj.formatted_address);
        try { await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id); } catch(e) {}

        const newEntry = {
            id: `rest_${Date.now()}`,
            name: spotObj.name,
            cuisine: enrichment.cuisine,
            vibe: enrichment.vibe,
            area: spotObj.formatted_address.split(',')[0] || 'Local',
            lat: spotObj.lat,
            lng: spotObj.lng,
            maps_url: spotObj.maps_url,
            saved_at: new Date().toISOString().split('T')[0],
            visited: false,
            rating: null
        };
        
        if (!vault.restaurants) vault.restaurants = [];
        vault.restaurants.push(newEntry);
        
        await writeUserVault(userId, vault);
        
        await ctx.editMessageText(
            `🎉 *Successfully Saved with AI Enrichment!* \n\n` +
            `📍 **${spotObj.name}**\n` +
            `🥘 *Cuisine:* ${enrichment.cuisine}\n` +
            `✨ *Vibe:* ${enrichment.vibe}\n\n` +
            `Securely encrypted and committed to your personal food brain.\n` +
            `Check your web dashboard to see it on the map!`,
            { parse_mode: 'Markdown' }
        );
        
        discoverySessionStore.delete(sessionKey);
        
        // Dynamic prompt for who recommended this spot
        await promptRecommender(ctx, newEntry.id, spotObj.name, userId);
        
    } catch (e) {
        console.error("Error saving search spot:", e.message);
        ctx.reply("❌ Failed to save the spot. Please try again.");
    }
});

// --- SOCIAL RECOMMENDER ATTACHMENT ---
const promptRecommender = async (ctx, restaurantId, restaurantName, userId) => {
    try {
        const { listAllUsers } = require('./skills/vault_router');
        const allUsers = await listAllUsers();
        
        // Filter out current user and invalid names
        const friends = allUsers.filter(u => u.userId !== userId.toString() && u.profile.name && u.profile.name !== "No Name");
        
        const buttons = [];
        // Dynamic peer options from the server circle!
        friends.forEach(f => {
            buttons.push([Markup.button.callback(`⚡ Recommended by ${f.profile.name}`, `set_recommender_${restaurantId}_${f.profile.name}`)]);
        });
        
        // Default options
        buttons.push([Markup.button.callback('👤 Found it myself (Myself)', `set_recommender_${restaurantId}_Myself`)]);
        buttons.push([Markup.button.callback('👥 Another Friend', `set_recommender_${restaurantId}_Friend`)]);
        
        await ctx.reply(
            `❓ *Who recommended "${restaurantName}" to you?*\n` +
            `This maps your social trust circle on your CraveMap dashboard topology!`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard(buttons)
            }
        );
    } catch (err) {
        console.error("Error prompting recommender:", err.message);
    }
};

bot.action(/set_recommender_(rest_[0-9]+|[0-9]+)_(.+)/, async (ctx) => {
    try {
        await ctx.answerCbQuery('Saving trust...');
        const restaurantId = ctx.match[1];
        const recommender = ctx.match[2];
        const userId = ctx.from.id;
        
        const { readUserVault, writeUserVault } = require('./skills/vault_router');
        const vault = await readUserVault(userId);
        
        const spot = (vault.restaurants || []).find(r => r.id === restaurantId);
        if (spot) {
            spot.source = (recommender === 'Myself' ? 'none' : recommender);
            await writeUserVault(userId, vault);
            
            await ctx.editMessageText(
                `🤝 *Trust Connection Registered!* \n\n` +
                `📍 **${spot.name}** is now linked to **${recommender === 'Myself' ? 'your own discovery' : recommender}** in your social taste vault.\n` +
                `Watch this trust link light up in your Social Taste Graph!`,
                { parse_mode: 'Markdown' }
            );
        } else {
            ctx.reply("❌ Unable to update (restaurant spot not found in your vault).");
        }
    } catch (err) {
        console.error("Error setting recommender:", err.message);
    }
};

// --- NEW ONBOARDING ACTIONS ---
bot.action(/ob_diet_(veg|nonveg|vegan|egg)/, async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const mapping = { veg: 'Vegetarian', nonveg: 'Non-Veg', vegan: 'Vegan', egg: 'Eggetarian' };
        await onboarding.handleDietType(ctx, mapping[ctx.match[1]]);
    } catch (e) { console.error(e); }
});

bot.action(/ob_cuisine_done/, async (ctx) => {
    try {
        await onboarding.handleCuisineDone(ctx);
    } catch (e) {
        if (e.message && e.message.includes('not modified')) return;
        console.error(e);
    }
});

bot.action(/ob_cuisine_(.+)/, async (ctx) => {
    try {
        await onboarding.handleCuisineToggle(ctx, ctx.match[1]);
    } catch (e) {
        if (e.message && e.message.includes('not modified')) return;
        console.error(e);
    }
});

bot.action(/ob_spice_(.+)/, async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const mapping = { extreme: 'Extreme', medium: 'Medium', mild: 'Mild' };
        await onboarding.handleSpice(ctx, mapping[ctx.match[1]]);
    } catch (e) { console.error(e); }
});

bot.action(/ob_style_(.+)/, async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const mapping = { explorer: 'Explorer', loyalist: 'Loyalist' };
        await onboarding.handleStyle(ctx, mapping[ctx.match[1]]);
    } catch (e) { console.error(e); }
});

bot.command('whoami', async (ctx) => {
    try {
        const userId = ctx.from.id;
        const vault = await readUserVault(userId);
        if (!vault.user_profile || !vault.user_profile.onboarding_complete) {
            return ctx.reply("You haven't completed your Food DNA onboarding yet. Run /start to begin.");
        }
        
        const Groq = require("groq-sdk");
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        
        const completion = await groq.chat.completions.create({
            messages: [{
                role: "system",
                content: "You are a creative persona generator. Based on the user's food profile, generate a fun, creative 2-4 word title (e.g. 'The Indiranagar Spice-King', 'The Cozy Cafe Collector'). Return ONLY the title string."
            }, {
                role: "user",
                content: JSON.stringify(vault.user_profile)
            }],
            model: "llama-3.3-70b-versatile"
        });
        
        const persona = completion.choices[0].message.content.replace(/["']/g, '');
        vault.user_profile.persona_name = persona;
        writeUserVault(userId, vault);

        const p = vault.user_profile;
        const msg = `👑 *Your Food Persona*\n\n` +
                    `*${persona}*\n\n` +
                    `🍽️ *Diet:* ${p.diet_type}\n` +
                    `🌍 *Cuisines:* ${(p.favorite_cuisines || []).join(', ')}\n` +
                    `🌶️ *Spice:* ${p.spice_tolerance}\n` +
                    `🧭 *Style:* ${p.eating_style}\n\n` +
                    `_Your Sovereign Vault holds ${(vault.restaurants || []).length} saved spots._`;

        ctx.reply(msg, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('⚠️ Reset Profile', 'reset_profile')]])
        });
        
    } catch (e) {
        ctx.reply("❌ Failed to synthesize persona: " + e.message);
    }
});

bot.action('reset_profile', async (ctx) => {
    ctx.answerCbQuery();
    const userId = ctx.from.id;
    ctx.reply("Profile reset triggered. To fully wipe your data, run /wipe_memory.");
    try {
        const vault = await readUserVault(userId);
        delete vault.user_profile;
        writeUserVault(userId, vault);
    } catch (e) {}
});

bot.on('new_chat_members', async (ctx) => {
    try {
        const memory = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
        if (memory.user_profile && memory.user_profile.persona_name) {
            ctx.reply(`🤝 *A ${memory.user_profile.persona_name} has joined the table.*\n\nSocial Taste Graph updated! We'll factor in their preferences for future group decisions.`, { parse_mode: 'Markdown' });
        }
    } catch (e) {}
});

// Start the Heartbeat Daemon (runs every hour)
cron.schedule('0 * * * *', () => {
    evaluateAndTriggerAgency(bot);
});

// In-memory store for veto context (spotId → spot data)
const vetoSessionStore = new Map();

// Component 1: The Consensus Decision Card (Phase 10: Lobby Manager)
bot.command('consensus', async (ctx) => {
    saveChatId(ctx);
    
    // ENFORCE GROUP CHAT: Consensus can only be triggered in group environments
    if (ctx.chat.type === 'private') {
        const botName = ctx.botInfo ? ctx.botInfo.username : 'CraveMap_Sovereign_Bot';
        return ctx.reply(
            `👥 *Group Consensus requires a Group Chat!*\n\n` +
            `To reach a multi-user culinary consensus with your friends or colleagues, please:\n` +
            `1. ➕ **Create a new Telegram Group** (or open an existing group).\n` +
            `2. 🤖 **Add this bot** (@${botName}) to the group chat.\n` +
            `3. 🚀 Run the \`/consensus\` command **inside the group chat** to trigger the live voting lobby!\n\n` +
            `_Sovereign consensus algorithms require a multi-user group network to run peer-to-peer voting._`,
            { parse_mode: 'Markdown' }
        );
    }
    
    await lobby_manager.startLobby(ctx);
});

bot.action('lobby_join', async (ctx) => {
    try {
        await lobby_manager.handleJoin(ctx);
    } catch (e) {
        console.error(e);
    }
});

bot.action('lobby_finalize', async (ctx) => {
    try {
        await lobby_manager.handleFinalize(ctx);
    } catch (e) {
        console.error(e);
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
    try {
        const userId = ctx.from.id;
        const { getVaultPath } = require('./skills/vault_router');
        const userVaultPath = getVaultPath(userId);
        if (fs.existsSync(userVaultPath)) {
            ctx.replyWithDocument({ source: userVaultPath, filename: 'my_sovereign_vault.json' }, { caption: "🔐 Here is your completely raw, offline data. You own this." });
        } else {
            ctx.reply("Your vault is currently empty.");
        }
    } catch (e) {
        ctx.reply("Failed to export vault.");
    }
});

bot.command('wipe_memory', async (ctx) => {
    try {
        const userId = ctx.from.id;
        const { getVaultPath, readUserVault, writeUserVault } = require('./skills/vault_router');
        const userVaultPath = getVaultPath(userId);
        
        if (fs.existsSync(userVaultPath)) {
            const vault = await readUserVault(userId);
            const name = vault.user_profile?.name || "Preetam";
            
            // Keep identity, reset onboarding and clean restaurants list
            vault.user_profile = {
                telegram_id: userId,
                telegram_username: ctx.from?.username || 'Unknown',
                name: name,
                onboarded_at: new Date().toISOString(),
                awaiting_name_input: false, // Don't ask them to re-type their name
                onboarding_complete: false
            };
            
            vault.restaurants = [];
            vault.craving_patterns = {};
            vault.social_graph = {};
            vault.visit_history = [];
            vault.analytics = {};
            vault.negative_preferences = [];
            
            await writeUserVault(userId, vault);
            ctx.reply(`☢️ Nuclear wipe complete. Your Sovereign Vault data has been wiped, but your profile name (*${name}*) is preserved.\n\nType /start to complete onboarding!`, { parse_mode: 'Markdown' });
        } else {
            ctx.reply("You do not have an active Sovereign Vault to wipe.");
        }
    } catch (e) {
        ctx.reply("Failed to wipe vault.");
    }
});

bot.command('privacy_mode', async (ctx) => {
    try {
        const userId = ctx.from.id;
        const vault = await readUserVault(userId);
        if (!vault.analytics) vault.analytics = {};
        vault.analytics.privacy_mode = !vault.analytics.privacy_mode;
        writeUserVault(userId, vault);
        
        if (vault.analytics.privacy_mode) {
            ctx.reply("🕵️‍♂️ Privacy Mode: ON. Your data will be ignored in the next Group Consensus calculation.");
        } else {
            ctx.reply("🌍 Privacy Mode: OFF. Your tastes will influence the Social Taste Graph.");
        }
    } catch (e) {
        ctx.reply("Failed to toggle privacy mode.");
    }
});

// PART 3: SOVEREIGN LOCAL-FIRST ENFORCEMENT
// Stealth Mode: Block all external API calls (Discovery, Web Search, Video Ingestion)
bot.command('stealth_mode', async (ctx) => {
    try {
        const userId = ctx.from.id;
        const vault = await readUserVault(userId);
        if (!vault.analytics) vault.analytics = {};
        vault.analytics.stealth_mode = !vault.analytics.stealth_mode;
        await writeUserVault(userId, vault);
        
        if (vault.analytics.stealth_mode) {
            ctx.reply(
                `🕶️ *STEALTH MODE: ACTIVE* 🕶️\n\n` +
                `✅ *Blocked:*\n` +
                `• Discovery API calls (Nominatim, Google Places)\n` +
                `• Web search (Tavily)\n` +
                `• Social media ingestion (Instagram/TikTok)\n` +
                `• Weather API calls\n\n` +
                `✅ *Still Available:*\n` +
                `• Personal vault queries\n` +
                `• Craving cycle tracking (local)\n` +
                `• Group consensus (peer-only)\n\n` +
                `🔒 Your Sovereign Food Brain operates 100% offline.\n` +
                `All computation happens on your machine.`,
                { parse_mode: 'Markdown' }
            );
        } else {
            ctx.reply(
                `🌍 *STEALTH MODE: DEACTIVATED* 🌍\n\n` +
                `External APIs now accessible for discovery and enrichment.`,
                { parse_mode: 'Markdown' }
            );
        }
    } catch (e) {
        ctx.reply("Failed to toggle stealth mode.");
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
        const response = await axios.post('http://localhost:5001/api/discover', { area, userId: ctx.from.id });
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
        const response = await axios.post('http://localhost:5001/api/discover', { area: 'Bangalore', userId: ctx.from.id });
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
        const response = await axios.post('http://localhost:5001/api/discover', { area: 'Current Location', lat: latitude, lon: longitude, userId: ctx.from.id });
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
        await axios.post('http://localhost:5001/api/save-discovery', { discovery: spot, userId: ctx.from.id });
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
const rateLimiter = new Map();

bot.on('text', async (ctx) => {
    saveChatId(ctx);
    const text = ctx.message.text;
    const userId = ctx.from.id;
    
    // Catch username input during onboarding
    try {
        const vault = await readUserVault(userId);
        if (vault.user_profile && vault.user_profile.awaiting_name_input) {
            const typedName = text.trim();
            if (typedName.length < 2 || typedName.length > 30 || typedName.includes("/")) {
                return ctx.reply("⚠️ Please enter a valid name (between 2 and 30 characters, no slashes):");
            }
            
            const sanitized = typedName.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
            const MEMORY_DIR = path.join(__dirname, 'memory');
            const targetPath = path.join(MEMORY_DIR, `${sanitized}.json`);
            
            // SECURITY/INTELLIGENCE: If user-vault already exists on disk, link and load it instantly!
            if (fs.existsSync(targetPath)) {
                try {
                    const existingDataStr = fs.readFileSync(targetPath, 'utf8');
                    const existingData = JSON.parse(existingDataStr);
                    
                    if (existingData.user_profile) {
                        // Associate current Telegram ID to this existing vault!
                        existingData.user_profile.telegram_id = userId;
                        existingData.user_profile.telegram_username = ctx.from?.username || 'Unknown';
                        delete existingData.user_profile.awaiting_name_input;
                        
                        // Save the updated vault back to disk
                        const { writeUserVault } = require('./skills/vault_router');
                        await writeUserVault(sanitized, existingData);
                        
                        // Clean up temporary user_<id>.json if it exists
                        const tempPath = path.join(MEMORY_DIR, `user_${userId}.json`);
                        if (fs.existsSync(tempPath)) {
                            fs.unlinkSync(tempPath);
                        }
                        
                        let spotCount = 0;
                        if (Array.isArray(existingData.restaurants)) {
                            spotCount = existingData.restaurants.length;
                        } else if (typeof existingData.restaurants === 'string') {
                            try {
                                const cryptoUtil = require('./utils/crypto');
                                const dec = JSON.parse(cryptoUtil.decrypt(existingData.restaurants));
                                spotCount = Array.isArray(dec) ? dec.length : 0;
                            } catch (e) {}
                        }
                        
                        return ctx.reply(
                            `🔑 *Sovereign Vault Linked Successfully!* 🔐\n\n` +
                            `Welcome back, *${existingData.user_profile.name}*! I found your existing vault file on disk with *${spotCount} saved spot(s)*.\n\n` +
                            `Your profile and data are fully loaded and active. Run /whoami or search your vault anytime!`,
                            { parse_mode: 'Markdown' }
                        );
                    }
                } catch (err) {
                    console.error("Existing vault merge error:", err.message);
                }
            }
            
            // Save name to profile and remove wait flag
            vault.user_profile.name = typedName;
            delete vault.user_profile.awaiting_name_input;
            await writeUserVault(userId, vault);
            
            // Rename file to <username>.json
            const { renameVaultFile } = require('./skills/vault_router');
            await renameVaultFile(userId, typedName);
            
            // Proceed to Diet Question
            const onboarding = require('./skills/onboarding');
            return onboarding.askDietType(ctx, typedName);
        }
    } catch (e) {
        console.error("Onboarding Name Capture Error:", e.message);
    }
    
    // Distinguish between a URL save request and a Natural Language search
    if (text.includes("http") || text.includes("instagram") || text.includes("tiktok")) {
        
        // Rate Limiter Logic (Max 1 link per 30 seconds per user)
        const now = Date.now();
        const userLastSent = rateLimiter.get(userId) || 0;
        if (now - userLastSent < 30000) {
            return ctx.reply("🛑 Please slow down! Wait 30 seconds before sending another link so my AI doesn't overload.");
        }
        rateLimiter.set(userId, now);

        ctx.reply("⚡ Agent Social Hunter is processing your media link...");
        try {
            const response = await axios.post('http://localhost:5001/api/save', { text, userId: ctx.from.id }, { timeout: 60000 });
            if (response.data.success) {
                if (response.data.isDiscovery) {
                    ctx.reply(response.data.message);
                } else {
                    const entry = response.data.entry;
                    const mapsLink = entry.maps_url ? `\n🗺️ [Google Maps](${entry.maps_url})` : '';
                    await ctx.reply(`📍 Saved to Sovereign Bucket!\n\nName: ${entry.name}\nCuisine: ${entry.cuisine}\nArea: ${entry.area}${mapsLink}\n\nCheck your dashboard for behavioral insights.`, { parse_mode: 'Markdown' });
                    
                    // Trigger dynamic recommender prompt!
                    await promptRecommender(ctx, entry.id, entry.name, userId);
                }
            } else {
                // Show actual error from API (Instagram auth, Gemini limits, etc.)
                const errorMsg = response.data.message || response.data.error_msg || "Unable to process this link.";
                ctx.reply(`⚠️ ${errorMsg}`);
            }
        } catch (error) {
            console.error("❌ Instagram Processing Error:", error.message);
            if (error.code === 'ECONNREFUSED') {
                ctx.reply("❌ Backend API is unreachable. Please try again in a moment.");
            } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
                ctx.reply("⏱️ Video processing timed out. Try:\n1. A shorter video/reel\n2. Just the restaurant name\n3. A Google Maps link");
            } else if (error.response?.status === 400) {
                ctx.reply(error.response.data?.message || "🛡️ Can't process this video. Try sending the restaurant name instead!");
            } else {
                ctx.reply("🛡️ Video processing failed.\n\n**Alternatives:**\n📝 Send restaurant name\n🗺️ Share Google Maps link\n📸 Upload a food photo");
            }
        }
    } else {
        // Natural Language Search
        ctx.reply(`🔍 Querying Sovereign Vault for: "${text}"...`);
        try {
            const response = await axios.post('http://localhost:5001/api/search-vault', { query: text, userId: ctx.from.id });
            const { filters, results } = response.data;
            
            if (results && results.length > 0) {
                let replyMsg = `🧠 *Found in your Sovereign Vault:* \n\n`;
                results.forEach((r, i) => {
                    replyMsg += `${i+1}. **${r.name}** - ${r.area} (${r.cuisine || 'Food'})\n   _${r.vibe || 'No vibe tags'}_\n\n`;
                });
                ctx.replyWithMarkdown(replyMsg);
            } else {
                // Trigger Web Search Scout Safety Net
                ctx.reply(`⚠️ No matching spots found in your local vault.\n\n🛰️ *Safety Net:* Triggering Web Search Scout to find "${text}" on the live web...`);
                
                const { resolveGeocoordinates } = require('./skills/location_service');
                const userCity = await getUserCity(ctx.from.id);
                const geoSpot = await resolveGeocoordinates(text, userCity);
                
                if (geoSpot && geoSpot.lat && geoSpot.lng) {
                    const spotObj = {
                        name: text,
                        formatted_address: geoSpot.formatted_address || `${text}, ${userCity}`,
                        lat: geoSpot.lat,
                        lng: geoSpot.lng,
                        maps_url: geoSpot.maps_url,
                        source: geoSpot.source
                    };
                    
                    const sessionKey = makeDiscoveryKey(spotObj);
                    
                    await ctx.reply(
                        `🌐 *Found on the live web!* \n\n` +
                        `*Name:* ${spotObj.name}\n` +
                        `*Address:* ${spotObj.formatted_address}\n` +
                        `*Source:* Live ${geoSpot.source === 'google' ? 'Google Places' : 'OpenStreetMap'}\n\n` +
                        `Would you like to save this spot to your Sovereign Vault?`,
                        {
                            parse_mode: 'Markdown',
                            ...Markup.inlineKeyboard([
                                [Markup.button.callback('📥 Save to my Sovereign Vault', `add_search_spot_${sessionKey}`)]
                            ])
                        }
                    );
                } else {
                    ctx.reply(`❌ Even the live web scout couldn't find "${text}". Try checking the spelling or typing a more specific address!`);
                }
            }
        } catch (err) {
            console.error("❌ Search Vault Error:", err.message);
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
        const verifyRes = await axios.post('http://localhost:5001/api/verify-visit', { imagePath: tmpPath, userId: ctx.from.id });
        const result = verifyRes.data;

        if (result.gemini_unavailable) {
            // Graceful fallback: offer manual confirmation
            return ctx.reply(
                '⚠️ *Vision engine is temporarily busy.* Want to mark a visit manually?\n\nReply with the restaurant name and I\'ll update your vault.',
                { parse_mode: 'Markdown' }
            );
        }

        if (!result.success || !result.identified) {
            // Check if there are proactive cuisine-based suggestions!
            if (result.cuisine_visible && Array.isArray(result.suggested_matches) && result.suggested_matches.length > 0) {
                const matchButtons = result.suggested_matches.slice(0, 3).map(r => {
                    const base64Name = Buffer.from(r.name).toString('base64').replace(/=/g, '');
                    return [Markup.button.callback(`✅ Check-in at ${r.name}`, `vchk_${base64Name}`)];
                });
                
                return ctx.reply(
                    `🤔 *I couldn't identify the specific restaurant name from this photo alone (confidence: 0%), but I see some delicious ${result.cuisine_visible}!* \n\n` +
                    `Would you like to check in to one of your saved *${result.cuisine_visible}* spots from your vault?`,
                    {
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard(matchButtons)
                    }
                );
            }

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

// Vision Proactive Check-in Confirmation Action
bot.action(/vchk_(.+)/, async (ctx) => {
    ctx.answerCbQuery('Marking visited...');
    const userId = ctx.from.id;
    const base64Name = ctx.match[1];
    
    try {
        const { readUserVault, writeUserVault } = require('./skills/vault_router');
        const vault = await readUserVault(userId);
        
        // Find matching restaurant by comparing base64 strings to support arbitrary casing/accents
        const targetIdx = vault.restaurants.findIndex(r => {
            const b64 = Buffer.from(r.name).toString('base64').replace(/=/g, '');
            return b64 === base64Name;
        });
        
        if (targetIdx !== -1) {
            const restaurantName = vault.restaurants[targetIdx].name;
            vault.restaurants[targetIdx].visited = true;
            
            // Reset craving cycle for this cuisine
            const cuisine = vault.restaurants[targetIdx].cuisine;
            if (cuisine) {
                const cuisines = cuisine.split(',').map(c => c.trim().toLowerCase());
                if (!vault.craving_patterns) vault.craving_patterns = {};
                cuisines.forEach(c => {
                    vault.craving_patterns[c] = { last_satisfied: new Date().toISOString(), cooldown_days: 5 };
                });
            }
            
            await writeUserVault(userId, vault);
            ctx.reply(`✅ *Visit Verified!*\n\n📍 *${restaurantName}* has been marked as visited in your vault. Your Craving Cycle timer has been reset! 🔄`, { parse_mode: 'Markdown' });
        } else {
            ctx.reply(`⚠️ Spot not found in your vault.`);
        }
    } catch (e) {
        ctx.reply("❌ Check-in failed: " + e.message);
    }
});

console.log("REACHED BOT.LAUNCH");
bot.launch()
    .then(() => console.log("🚀 Sovereign Bot is LIVE on Telegram"))
    .catch((err) => console.error("❌ Bot failed to launch:", err.message));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
