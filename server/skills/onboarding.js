const { Markup } = require('telegraf');
const { updateUserProfile, readUserVault } = require('./vault_router');

// In-memory store for multi-select cuisine session
const cuisineSelections = new Map();

const CUISINE_OPTIONS = [
    { label: '🍛 Indian', value: 'Indian' },
    { label: '🍕 Italian', value: 'Italian' },
    { label: '🥡 Chinese', value: 'Chinese' },
    { label: '🍣 Japanese', value: 'Japanese' },
    { label: '🌮 Mexican', value: 'Mexican' },
    { label: '🍔 Continental', value: 'Continental' },
    { label: '🍜 Thai', value: 'Thai' },
    { label: '🥘 Korean', value: 'Korean' },
];

const startOnboarding = async (ctx) => {
    const userId = ctx.from.id;
    const firstName = ctx.from?.first_name || 'Foodie';
    const username = ctx.from?.username || 'Unknown';

    // Save identity instantly
    updateUserProfile(userId, 'name', firstName);
    updateUserProfile(userId, 'telegram_username', username);
    updateUserProfile(userId, 'telegram_id', userId);
    updateUserProfile(userId, 'onboarded_at', new Date().toISOString());

    await ctx.reply(
        `🧬 *Welcome to CraveMap, ${firstName}!*\n\n` +
        `I need to understand your food personality. Just 4 quick taps — no typing needed.\n\n` +
        `*Step 1 of 4: What do you eat?*`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🥬 Vegetarian', 'ob_diet_veg'), Markup.button.callback('🍗 Non-Veg', 'ob_diet_nonveg')],
                [Markup.button.callback('🌱 Vegan', 'ob_diet_vegan'), Markup.button.callback('🥚 Eggetarian', 'ob_diet_egg')]
            ])
        }
    );
};

const handleDietType = async (ctx, diet) => {
    const userId = ctx.from.id;
    updateUserProfile(userId, 'diet_type', diet);

    // Initialize cuisine selection for this user
    cuisineSelections.set(userId, []);

    await ctx.editMessageText(
        `🧬 *Step 2 of 4: Pick your favorite cuisines*\n\n` +
        `Tap all that apply, then hit *Done ✅*\n\n` +
        `Selected: _None yet_`,
        {
            parse_mode: 'Markdown',
            ...buildCuisineKeyboard(userId)
        }
    );
};

const buildCuisineKeyboard = (userId) => {
    const selected = cuisineSelections.get(userId) || [];
    const rows = [];

    for (let i = 0; i < CUISINE_OPTIONS.length; i += 2) {
        const row = [];
        for (let j = i; j < i + 2 && j < CUISINE_OPTIONS.length; j++) {
            const opt = CUISINE_OPTIONS[j];
            const isSelected = selected.includes(opt.value);
            row.push(
                Markup.button.callback(
                    isSelected ? `✅ ${opt.label}` : opt.label,
                    `ob_cuisine_${opt.value.toLowerCase()}`
                )
            );
        }
        rows.push(row);
    }

    // Done button
    rows.push([Markup.button.callback('✅ Done — Next Step', 'ob_cuisine_done')]);

    return Markup.inlineKeyboard(rows);
};

const handleCuisineToggle = async (ctx, cuisineKey) => {
    const userId = ctx.from.id;
    const cuisine = CUISINE_OPTIONS.find(c => c.value.toLowerCase() === cuisineKey);
    if (!cuisine) return ctx.answerCbQuery("Unknown cuisine");

    let selected = cuisineSelections.get(userId) || [];

    // Toggle
    if (selected.includes(cuisine.value)) {
        selected = selected.filter(c => c !== cuisine.value);
    } else {
        selected.push(cuisine.value);
    }
    cuisineSelections.set(userId, selected);

    const selectedText = selected.length > 0 ? selected.join(', ') : '_None yet_';

    await ctx.editMessageText(
        `🧬 *Step 2 of 4: Pick your favorite cuisines*\n\n` +
        `Tap all that apply, then hit *Done ✅*\n\n` +
        `Selected: ${selectedText}`,
        {
            parse_mode: 'Markdown',
            ...buildCuisineKeyboard(userId)
        }
    );

    await ctx.answerCbQuery(selected.includes(cuisine.value) ? `Added ${cuisine.value}` : `Removed ${cuisine.value}`);
};

const handleCuisineDone = async (ctx) => {
    const userId = ctx.from.id;
    const selected = cuisineSelections.get(userId) || [];

    if (selected.length === 0) {
        return ctx.answerCbQuery("Pick at least one cuisine!");
    }

    updateUserProfile(userId, 'favorite_cuisines', selected);
    cuisineSelections.delete(userId); // Clean up

    await ctx.editMessageText(
        `🧬 *Step 3 of 4: Spice Tolerance*\n\n` +
        `How much heat can you handle?`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔥 Extreme', 'ob_spice_extreme')],
                [Markup.button.callback('🌶️ Medium', 'ob_spice_medium')],
                [Markup.button.callback('🍦 Mild', 'ob_spice_mild')]
            ])
        }
    );
};

const handleSpice = async (ctx, level) => {
    const userId = ctx.from.id;
    updateUserProfile(userId, 'spice_tolerance', level);

    await ctx.editMessageText(
        `🧬 *Step 4 of 4: Food Personality*\n\n` +
        `When it comes to restaurants, are you...`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🧭 Explorer — Always trying new spots', 'ob_style_explorer')],
                [Markup.button.callback('🏡 Loyalist — I know what I like', 'ob_style_loyalist')]
            ])
        }
    );
};

const handleStyle = async (ctx, style) => {
    const userId = ctx.from.id;
    updateUserProfile(userId, 'eating_style', style);
    updateUserProfile(userId, 'onboarding_complete', true);

    // Build a summary
    const vault = readUserVault(userId);
    const p = vault.user_profile;

    await ctx.editMessageText(
        `🧬 *Food DNA Captured!* ✅\n\n` +
        `Here's what I know about you:\n\n` +
        `👤 *${p.name}*\n` +
        `🍽️ Diet: ${p.diet_type}\n` +
        `🌍 Cuisines: ${(p.favorite_cuisines || []).join(', ')}\n` +
        `🌶️ Spice: ${p.spice_tolerance}\n` +
        `🧭 Style: ${p.eating_style === 'Explorer' ? 'Explorer — loves new spots' : 'Loyalist — sticks to favorites'}\n\n` +
        `Your profile is securely stored in your personal Sovereign Vault.\n\n` +
        `Run /whoami anytime to see your Food Persona!`,
        { parse_mode: 'Markdown' }
    );
};

module.exports = {
    startOnboarding,
    handleDietType,
    handleCuisineToggle,
    handleCuisineDone,
    handleSpice,
    handleStyle
};
