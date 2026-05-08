const fs = require('fs');
const path = require('path');
const writeFileAtomic = require('write-file-atomic');
const cryptoUtil = require('../utils/crypto');

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
    // SECURITY: Prevent Path Traversal by strictly enforcing alphanumeric characters
    if (!/^[a-zA-Z0-9_-]+$/.test(telegramUserId.toString())) {
        throw new Error("Invalid userId format: Path Traversal Attempt Blocked");
    }
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
 * Reads a user's vault asynchronously to prevent event loop blocking.
 * Creates a fresh one if it doesn't exist.
 */
const readUserVault = async (telegramUserId) => {
    const vaultPath = getVaultPath(telegramUserId);
    if (!fs.existsSync(vaultPath)) {
        const fresh = createFreshVault();
        await fs.promises.writeFile(vaultPath, JSON.stringify(fresh, null, 2));
        return fresh;
    }
    const dataStr = await fs.promises.readFile(vaultPath, 'utf8');
    const parsedData = JSON.parse(dataStr);
    
    // Sovereign Encryption: Decrypt restaurants array if it's encrypted
    if (typeof parsedData.restaurants === 'string') {
        try {
            const decryptedStr = cryptoUtil.decrypt(parsedData.restaurants);
            parsedData.restaurants = JSON.parse(decryptedStr);
        } catch (e) {
            console.error(`Failed to decrypt vault for ${telegramUserId}:`, e.message);
            parsedData.restaurants = [];
        }
    }
    
    return parsedData;
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
                // Sovereign Encryption: Encrypt restaurants array before saving
                const vaultCopy = { ...data };
                if (Array.isArray(vaultCopy.restaurants)) {
                    vaultCopy.restaurants = cryptoUtil.encrypt(JSON.stringify(vaultCopy.restaurants));
                }
                
                await writeFileAtomic(vaultPath, JSON.stringify(vaultCopy, null, 2));
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
    const vaultCopy = { ...data };
    if (Array.isArray(vaultCopy.restaurants)) {
        vaultCopy.restaurants = cryptoUtil.encrypt(JSON.stringify(vaultCopy.restaurants));
    }
    fs.writeFileSync(vaultPath, JSON.stringify(vaultCopy, null, 2));
};

/**
 * Updates a specific key in a user's profile atomically.
 */
const updateUserProfile = async (telegramUserId, key, value) => {
    const vault = await readUserVault(telegramUserId);
    if (!vault.user_profile) vault.user_profile = {};
    vault.user_profile[key] = value;
    await writeUserVault(telegramUserId, vault);
};

/**
 * Lists all onboarded users by scanning for user_*.json files.
 * Returns an array of { userId, profile, spotCount }.
 */
const listAllUsers = async () => {
    const users = [];
    if (!fs.existsSync(MEMORY_DIR)) return users;

    const files = await fs.promises.readdir(MEMORY_DIR);
    const userFiles = files.filter(f => f.startsWith('user_') && f.endsWith('.json'));
    
    for (const file of userFiles) {
        try {
            const dataStr = await fs.promises.readFile(path.join(MEMORY_DIR, file), 'utf8');
            const data = JSON.parse(dataStr);
            const userId = file.replace('user_', '').replace('.json', '');
            if (data.user_profile && data.user_profile.name) {
                // Determine spot count based on whether it's encrypted or plaintext array
                let spotCount = 0;
                if (Array.isArray(data.restaurants)) spotCount = data.restaurants.length;
                else if (typeof data.restaurants === 'string') {
                    try {
                        const dec = JSON.parse(cryptoUtil.decrypt(data.restaurants));
                        spotCount = Array.isArray(dec) ? dec.length : 0;
                    } catch (e) {}
                }
                
                users.push({
                    userId,
                    profile: data.user_profile,
                    spotCount: spotCount,
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
