/**
 * Phase 8 - Component 4: Dynamic Re-weighting Engine
 * Analyzes negative feedback patterns and adjusts per-friend alignment weights.
 * Runs asynchronously after each veto — never blocks the bot.
 */
const fs = require('fs');
const path = require('path');

const MEMORY_PATH = path.join(__dirname, '..', 'memory', 'food_memory.json');
const VETO_THRESHOLD = 3; // Number of same-type vetoes before weight is adjusted

// Maps veto reason to which alignment dimension it penalizes
const VETO_DIMENSION_MAP = {
    too_expensive: 'budget_weight',
    too_far: 'proximity_weight',
    dislike_cuisine: 'cuisine_weight',
    not_in_mood: 'vibe_weight',
};

const runReweighting = () => {
    try {
        const memory = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
        const negativePrefs = memory.negative_preferences || [];

        if (negativePrefs.length < VETO_THRESHOLD) return; // Not enough data yet

        // Group vetoes by reason
        const reasonCounts = {};
        for (const pref of negativePrefs) {
            const reason = pref.reason;
            if (!reason) continue;
            reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        }

        // Current adjustments (or default to all 1.0)
        if (!memory.analytics) memory.analytics = {};
        if (!memory.analytics.alignment_adjustments) {
            memory.analytics.alignment_adjustments = {
                budget_weight: 1.0,
                proximity_weight: 1.0,
                cuisine_weight: 1.0,
                vibe_weight: 1.0,
                last_updated: null,
            };
        }

        const adjustments = memory.analytics.alignment_adjustments;
        let updated = false;

        for (const [reason, count] of Object.entries(reasonCounts)) {
            const dimension = VETO_DIMENSION_MAP[reason];
            if (!dimension) continue;

            if (count >= VETO_THRESHOLD) {
                // Apply graduated penalty:
                // 3 vetoes → 0.7x, 5 vetoes → 0.5x, 8+ vetoes → 0.3x
                let newWeight;
                if (count >= 8) newWeight = 0.3;
                else if (count >= 5) newWeight = 0.5;
                else newWeight = 0.7;

                // Only update if it's a meaningful change
                if (Math.abs((adjustments[dimension] || 1.0) - newWeight) > 0.05) {
                    adjustments[dimension] = newWeight;
                    updated = true;
                    console.log(`⚖️ Re-weighting: ${dimension} → ${newWeight} (${count} vetoes for "${reason}")`);
                }
            }

            // Recovery: if a dimension was penalized but recent vetoes don't include that reason,
            // slowly recover toward 1.0 (max recovery of 0.1 per run)
            const recentVetoes = negativePrefs.slice(-10);
            const recentReasonCount = recentVetoes.filter(p => p.reason === reason).length;
            if (recentReasonCount === 0 && adjustments[dimension] < 1.0) {
                adjustments[dimension] = Math.min(1.0, adjustments[dimension] + 0.1);
                updated = true;
                console.log(`⚖️ Re-weighting: ${dimension} recovering → ${adjustments[dimension]}`);
            }
        }

        if (updated) {
            adjustments.last_updated = new Date().toISOString();
            memory.analytics.alignment_adjustments = adjustments;
            fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
            console.log(`⚖️ Re-weighting complete. New adjustments:`, adjustments);
        }

    } catch (err) {
        console.error('❌ Re-weighting Engine Error:', err.message);
    }
};

/**
 * Write a negative preference event to the vault.
 */
const recordNegativePreference = (spotName, spotCuisine, reason, sessionWeight) => {
    try {
        const memory = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
        if (!memory.negative_preferences) memory.negative_preferences = [];

        memory.negative_preferences.push({
            restaurant_name: spotName,
            cuisine: spotCuisine || null,
            reason,
            session_weight: sessionWeight,
            timestamp: new Date().toISOString(),
        });

        // Keep only the last 50 negative preferences (rolling window)
        if (memory.negative_preferences.length > 50) {
            memory.negative_preferences = memory.negative_preferences.slice(-50);
        }

        fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));

        // Trigger re-weighting asynchronously
        setImmediate(runReweighting);

        return true;
    } catch (err) {
        console.error('❌ Record Negative Preference Error:', err.message);
        return false;
    }
};

module.exports = { recordNegativePreference, runReweighting };
