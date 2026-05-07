const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');

/**
 * Returns the vault file path for a specific Telegram user.
 */
const getVaultPath = (telegramUserId) => {
    return path.join(MEMORY_DIR, `user_${telegramUserId}.json`);
};

/**
 * Creates a fresh vault structure for a new user.
 */
const createFreshVault = () => ({
    user_profile: {},
    restaurants: [],
    craving_patterns: {},
    social_graph: {},
    visit_history: [],
    analytics: {},
    negative_preferences: []
});

/**
 * Reads a user's vault. Creates a fresh one if it doesn't exist.
 */
const readUserVault = (telegramUserId) => {
    const vaultPath = getVaultPath(telegramUserId);
    if (!fs.existsSync(vaultPath)) {
        const fresh = createFreshVault();
        fs.writeFileSync(vaultPath, JSON.stringify(fresh, null, 2));
        return fresh;
    }
    return JSON.parse(fs.readFileSync(vaultPath, 'utf8'));
};

/**
 * Writes data to a user's vault.
 */
const writeUserVault = (telegramUserId, data) => {
    const vaultPath = getVaultPath(telegramUserId);
    fs.writeFileSync(vaultPath, JSON.stringify(data, null, 2));
};

/**
 * Updates a specific key in a user's profile.
 */
const updateUserProfile = (telegramUserId, key, value) => {
    const vault = readUserVault(telegramUserId);
    if (!vault.user_profile) vault.user_profile = {};
    vault.user_profile[key] = value;
    writeUserVault(telegramUserId, vault);
};

/**
 * Lists all onboarded users by scanning for user_*.json files.
 * Returns an array of { userId, profile, spotCount }.
 */
const listAllUsers = () => {
    const users = [];
    if (!fs.existsSync(MEMORY_DIR)) return users;

    const files = fs.readdirSync(MEMORY_DIR).filter(f => f.startsWith('user_') && f.endsWith('.json'));
    for (const file of files) {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(MEMORY_DIR, file), 'utf8'));
            const userId = file.replace('user_', '').replace('.json', '');
            if (data.user_profile && data.user_profile.name) {
                users.push({
                    userId,
                    profile: data.user_profile,
                    spotCount: (data.restaurants || []).length
                });
            }
        } catch (e) {}
    }
    return users;
};

module.exports = {
    getVaultPath,
    readUserVault,
    writeUserVault,
    updateUserProfile,
    listAllUsers,
    createFreshVault
};
