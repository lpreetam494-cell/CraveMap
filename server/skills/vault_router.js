const fs = require('fs');
const path = require('path');
const writeFileAtomic = require('write-file-atomic');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');

/**
 * PART 1: ATOMIC DATA PERSISTENCE
 * 
 * Write queue manager prevents race conditions during concurrent agent operations.
 * All vault writes are serialized per user_id to prevent file truncation.
 */
class VaultWriteQueue {
    constructor() {
        this.queues = new Map(); // user_id → queue array
        this.processing = new Set(); // user_id → currently processing
    }

    async enqueue(userId, writeOperation) {
        if (!this.queues.has(userId)) {
            this.queues.set(userId, []);
        }
        
        const queue = this.queues.get(userId);
        queue.push(writeOperation);

        // Process queue if not already processing
        if (!this.processing.has(userId)) {
            await this._processQueue(userId);
        }
    }

    async _processQueue(userId) {
        this.processing.add(userId);
        const queue = this.queues.get(userId);

        while (queue && queue.length > 0) {
            const operation = queue.shift();
            try {
                await operation();
            } catch (err) {
                console.error(`❌ Atomic write failed for user ${userId}:`, err.message);
            }
        }

        this.processing.delete(userId);
    }
}

const writeQueue = new VaultWriteQueue();

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
    negative_preferences: [],
    stealth_mode: false  // NEW: Sovereign enforcement flag
});

/**
 * Reads a user's vault. Creates a fresh one if it doesn't exist.
 */
const readUserVault = (telegramUserId) => {
    const vaultPath = getVaultPath(telegramUserId);
    if (!fs.existsSync(vaultPath)) {
        const fresh = createFreshVault();
        // Use synchronous write for initialization only
        fs.writeFileSync(vaultPath, JSON.stringify(fresh, null, 2));
        return fresh;
    }
    return JSON.parse(fs.readFileSync(vaultPath, 'utf8'));
};

/**
 * Atomic write to user vault using write-file-atomic.
 * Serializes writes per user to prevent race conditions.
 */
const writeUserVault = async (telegramUserId, data) => {
    const vaultPath = getVaultPath(telegramUserId);
    
    return new Promise((resolve, reject) => {
        writeQueue.enqueue(telegramUserId, async () => {
            try {
                await writeFileAtomic(vaultPath, JSON.stringify(data, null, 2));
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    });
};

/**
 * Synchronous fallback for critical operations (marked as legacy).
 * DEPRECATED: Use writeUserVault() instead for atomic operations.
 */
const writeUserVaultSync = (telegramUserId, data) => {
    const vaultPath = getVaultPath(telegramUserId);
    fs.writeFileSync(vaultPath, JSON.stringify(data, null, 2));
};

/**
 * Updates a specific key in a user's profile atomically.
 */
const updateUserProfile = async (telegramUserId, key, value) => {
    const vault = readUserVault(telegramUserId);
    if (!vault.user_profile) vault.user_profile = {};
    vault.user_profile[key] = value;
    await writeUserVault(telegramUserId, vault);
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
                    spotCount: (data.restaurants || []).length,
                    stealthMode: data.stealth_mode || false
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
    writeUserVaultSync,
    updateUserProfile,
    listAllUsers,
    createFreshVault
};
