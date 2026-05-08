const crypto = require('crypto');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const ALGORITHM = 'aes-256-cbc';
// Ensure the key is exactly 32 bytes (256 bits)
const getSecretKey = () => {
    const rawKey = process.env.INTERNAL_API_SECRET || 'CRAVEMAP_DEFAULT_FALLBACK_SECRET_KEY';
    return crypto.createHash('sha256').update(String(rawKey)).digest('base64').substring(0, 32);
};

const encrypt = (text) => {
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(getSecretKey()), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (e) {
        console.error("Encryption failed:", e.message);
        return text;
    }
};

const decrypt = (text) => {
    try {
        const textParts = text.split(':');
        if (textParts.length !== 2) return text; // Not encrypted or malformed
        
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(getSecretKey()), iv);
        
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        // If decryption fails, it might be plaintext or corrupted, just return the raw string
        console.error("Decryption failed:", e.message);
        return text;
    }
};

module.exports = {
    encrypt,
    decrypt
};
