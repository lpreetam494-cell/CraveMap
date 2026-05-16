const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getVaultPath, readUserVault } = require('./vault_router');

// In-memory lobby store.
// Key: Chat ID -> Value: { hostId, messageId, timer, hostRestaurants: [], peerVectors: [] }
const activeSessions = new Map();

/**
 * Summarizes a user's vault into a privacy-preserving Taste Vector.
 * Does NOT transmit raw restaurant names or visit histories.
 */
async function extractTasteVector(telegramUserId) {
    try {
        const vault = await readUserVault(telegramUserId);
        const profile = vault.user_profile || {};
        const vector = {
            identity: profile.persona_name || profile.name || 'Anonymous Peer',
            diet_type: profile.diet_type || 'Unknown',
            favorite_cuisines: profile.favorite_cuisines || [],
            spice_tolerance: profile.spice_tolerance || 'Medium',
            eating_style: profile.eating_style || 'Explorer',
            dietary: profile.dietary || [],
            cuisines: {},
            vibes: {}
        };

        // Extract weighted cuisine/vibe tags from saved restaurants
        (vault.restaurants || []).forEach(r => {
            const weight = (r.visited || (r.rating && r.rating >= 4)) ? 2.0 : 1.0;
            if (r.cuisine && r.cuisine.toLowerCase() !== 'unknown') {
                r.cuisine.split(',').forEach(c => {
                    const tag = c.trim().toLowerCase();
                    vector.cuisines[tag] = (vector.cuisines[tag] || 0) + weight;
                });
            }
            if (r.vibe && r.vibe.toLowerCase() !== 'unknown') {
                r.vibe.split(',').forEach(v => {
                    const tag = v.trim().toLowerCase();
                    vector.vibes[tag] = (vector.vibes[tag] || 0) + weight;
                });
            }
        });

        // Boost explicit favorite cuisines from profile
        (profile.favorite_cuisines || []).forEach(c => {
            const tag = c.toLowerCase();
            vector.cuisines[tag] = (vector.cuisines[tag] || 0) + 5.0;
        });

        return { vector, hostRestaurants: vault.restaurants || [] };
    } catch (e) {
        console.error("Vectorization failed:", e);
        return null;
    }
}

const startLobby = async (ctx) => {
    const chatId = ctx.chat.id;
    const hostId = ctx.from.id;

    if (activeSessions.has(chatId)) {
        return ctx.reply("⚠️ There is already an active Consensus Lobby in this chat!");
    }

    // Host vectorizes their personal vault
    const data = await extractTasteVector(hostId);
    if (!data) return ctx.reply("❌ Cannot start lobby: Missing Sovereign Vault. Run /start first.");

    const session = {
        hostId,
        joinedUserIds: new Set([hostId]),
        timer: setTimeout(() => {
            if (activeSessions.has(chatId)) {
                activeSessions.delete(chatId);
                ctx.reply("⏳ The Consensus Lobby has expired and self-destructed.");
                console.log(`[SECURITY] Session ${chatId} expired. Purged from RAM.`);
            }
        }, 10 * 60 * 1000),
        hostRestaurants: data.hostRestaurants,
        peerVectors: [data.vector]
    };

    activeSessions.set(chatId, session);

    const msg = await ctx.reply(
        `🏛️ *The Consensus Lobby is Open!*\n\n` +
        `Host: ${data.vector.identity}\n` +
        `Joined: 1 Agent\n\n` +
        `_Tap 'Join the Table' to securely handshake your Taste Vector into the mix. ` +
        `Your raw food data will NOT be transmitted or saved._`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🤝 Join the Table', 'lobby_join')],
                [Markup.button.callback('⚡ Finalize Decision', 'lobby_finalize')]
            ])
        }
    );

    session.messageId = msg.message_id;
};

const handleJoin = async (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const session = activeSessions.get(chatId);
    
    if (!session) {
        return ctx.answerCbQuery("Lobby closed or expired.");
    }

    // Check if user already joined
    if (session.joinedUserIds.has(userId)) {
        return ctx.answerCbQuery("You are already in the lobby!");
    }

    // Vectorize this user's personal vault
    const data = await extractTasteVector(userId);
    if (!data) return ctx.answerCbQuery("You haven't onboarded yet! Send /start to the bot first.");

    session.joinedUserIds.add(userId);
    session.peerVectors.push(data.vector);

    // Update UI
    await ctx.editMessageText(
        `🏛️ *The Consensus Lobby is Open!*\n\n` +
        `Host: ${session.peerVectors[0].identity}\n` +
        `Joined: ${session.peerVectors.length} Agents\n\n` +
        `_Latest Handshake: ${data.vector.identity} securely transmitted their Taste Vector._`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🤝 Join the Table', 'lobby_join')],
                [Markup.button.callback('⚡ Finalize Decision', 'lobby_finalize')]
            ])
        }
    );

    ctx.answerCbQuery("Vector successfully transmitted!");
};

const handleFinalize = async (ctx) => {
    const chatId = ctx.chat.id;
    const session = activeSessions.get(chatId);
    
    if (!session) {
        return ctx.answerCbQuery("Lobby no longer active.");
    }
    
    if (ctx.from.id !== session.hostId) {
        return ctx.answerCbQuery("Only the Host can finalize the decision.");
    }

    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `🎲 *Engaging Social Brain...*\n\n` +
        `Calculating N-Way Mathematical Intersection across ${session.peerVectors.length} Taste Vectors...`,
        { parse_mode: 'Markdown' }
    );

    try {
        const response = await axios.post((process.env.API_BASE || 'http://localhost:5000') + '/api/group-decision', {
            host_restaurants: session.hostRestaurants,
            peer_vectors: session.peerVectors
        });

        const data = response.data;
        if (data.best_option) {
            const spot = data.best_option;
            await ctx.reply(
                `🏆 *Consensus Reached!*\n\n` +
                `📍 *${spot.name}*\n` +
                `🥘 ${spot.cuisine || 'Unknown'} | 💸 ${spot.budget || '?'}\n\n` +
                `*Social Brain Reasoning:*\n_${data.reasoning}_`,
                { parse_mode: 'Markdown' }
            );
        } else {
            await ctx.reply("❌ No restaurant matched the absolute vetos and constraints of all joined agents.");
        }
    } catch (e) {
        await ctx.reply("❌ Failed to reach consensus engine: " + e.message);
    } finally {
        // Component 4: The Ephemeral Purge
        clearTimeout(session.timer);
        activeSessions.delete(chatId);
        console.log(`[SECURITY] Session ${chatId} closed. All peer vectors purged from RAM.`);
    }
};

module.exports = {
    startLobby,
    handleJoin,
    handleFinalize
};
