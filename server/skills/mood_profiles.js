/**
 * Phase 8 - Component 2: Mood Profiles
 * Maps mood tags to concrete Social Brain weight overrides.
 */

const MOOD_PROFILES = {
    celebrations: {
        label: '🎉 Celebrations',
        ignore_budget: true,
        vibe_boost: ['rooftop', 'fine dining', 'premium', 'celebrations', 'special occasion', 'party'],
        cuisine_weight: 0.6,
        vibe_weight: 3.0,
        reasoning_prefix: 'Perfect for a celebration —',
    },
    quick_bite: {
        label: '⚡ Quick Bite',
        max_budget: 350,
        vibe_boost: ['quick', 'casual', 'street food', 'fast', 'takeaway', 'budget'],
        vibe_weight: 2.0,
        cuisine_weight: 1.0,
        proximity_priority: true,
        reasoning_prefix: 'Great for a quick, no-fuss meal —',
    },
    date_night: {
        label: '🌹 Date Night',
        ignore_budget: false,
        vibe_boost: ['romantic', 'cozy', 'rooftop', 'intimate', 'date', 'candlelit', 'fine dining'],
        cuisine_weight: 0.5,
        vibe_weight: 2.5,
        reasoning_prefix: 'Sets the perfect mood for a date night —',
    },
    comfort: {
        label: '🛋️ Comfort Food',
        vibe_boost: ['cozy', 'homestyle', 'warm', 'comfort', 'hearty', 'local'],
        cuisine_boost: ['biryani', 'south indian', 'north indian', 'indian', 'desi'],
        cuisine_weight: 1.5,
        vibe_weight: 1.5,
        reasoning_prefix: 'Just the comfort you need right now —',
    },
    healthy: {
        label: '🥗 Healthy',
        cuisine_boost: ['salad', 'healthy', 'vegan', 'vegetarian', 'clean', 'organic'],
        vibe_boost: ['clean eating', 'healthy', 'light', 'fresh'],
        cuisine_weight: 2.0,
        vibe_weight: 1.5,
        reasoning_prefix: 'Aligns with your healthy choices —',
    },
    hangover: {
        label: '😵 Comfort Mode',
        vibe_boost: ['hearty', 'comfort', 'casual', 'heavy', 'local'],
        cuisine_boost: ['biryani', 'south indian', 'north indian', 'pav bhaji', 'chole'],
        ignore_budget: true,
        cuisine_weight: 2.0,
        vibe_weight: 1.0,
        reasoning_prefix: 'The cure you deserve —',
    },
};

/**
 * Resolves a free-text mood input (e.g. "date night", "quick_bite") to a profile key.
 */
const resolveMood = (rawMood) => {
    if (!rawMood) return null;
    const normalized = rawMood.toLowerCase().replace(/[^a-z_]/g, '_').replace(/__+/g, '_');
    // Direct match
    if (MOOD_PROFILES[normalized]) return normalized;
    // Fuzzy match
    const moodKeys = Object.keys(MOOD_PROFILES);
    for (const key of moodKeys) {
        if (normalized.includes(key) || key.includes(normalized)) return key;
    }
    // Keyword fallback
    if (normalized.includes('celebrat')) return 'celebrations';
    if (normalized.includes('quick') || normalized.includes('fast')) return 'quick_bite';
    if (normalized.includes('date') || normalized.includes('romantic')) return 'date_night';
    if (normalized.includes('health') || normalized.includes('vegan')) return 'healthy';
    if (normalized.includes('comfort') || normalized.includes('cozy')) return 'comfort';
    return null;
};

/**
 * Merges a mood profile into the constraints object for the Social Brain.
 */
const applyMoodToConstraints = (constraints, moodKey) => {
    const profile = MOOD_PROFILES[moodKey];
    if (!profile) return constraints;

    return {
        ...constraints,
        mood: moodKey,
        mood_label: profile.label,
        mood_overrides: {
            ignore_budget: profile.ignore_budget || false,
            max_budget: profile.max_budget || null,
            vibe_boost: profile.vibe_boost || [],
            cuisine_boost: profile.cuisine_boost || [],
            cuisine_weight: profile.cuisine_weight || 1.0,
            vibe_weight: profile.vibe_weight || 1.0,
        },
        reasoning_prefix: profile.reasoning_prefix || '',
    };
};

module.exports = { MOOD_PROFILES, resolveMood, applyMoodToConstraints };
