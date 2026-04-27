/**
 * Lifestyle Operator Agent Skill
 * Handles actions, triggers, and communication.
 */

const getProactiveTriggers = (memory, weather) => {
    const triggers = [];
    const now = new Date();
    const hour = now.getHours();

    // 1. Weather Trigger: Rainy Day Ramen
    if (weather.condition === 'Rain') {
        triggers.push({
            type: 'CONTEXT_SYNC',
            title: 'Rainy Day Ramen',
            message: `It's raining in ${weather.city}. Perfect conditions for Ramen.`,
            action: 'View 3 nearby matches'
        });
    }

    // 2. Mealtime Reminders
    if (hour === 11 || hour === 12) {
        triggers.push({
            type: 'MEALTIME',
            message: "It's almost lunch! Ready to hit one of your saved spots?",
            action: 'SHOW_RECOMMENDATION'
        });
    } else if (hour === 19 || hour === 20) {
        triggers.push({
            type: 'MEALTIME',
            message: "Dinner time. You have 3 unvisited spots nearby.",
            action: 'SHOW_RECOMMENDATION'
        });
    }

    // 2. Craving Alerts (Cross-Temporal)
    const biryani = memory.craving_patterns.biryani;
    const lastHad = new Date(biryani.last_had);
    const diff = Math.ceil((now - lastHad) / (1000 * 60 * 60 * 24));
    
    if (diff > biryani.avg_cycle_days) {
        triggers.push({
            type: 'CRAVING',
            message: `🔥 You haven't had Biryani in ${diff} days. The cycle is broken!`,
            action: 'SUGGEST_CUISINE',
            cuisine: 'Biryani'
        });
    }

    return triggers;
};

const draftGroupPoll = (options) => {
    return {
        text: "Dinner tonight? Vote for your spot!",
        options: options.map(o => o.name),
        metadata: { type: 'poll', source: 'CraveMap' }
    };
};

module.exports = { getProactiveTriggers, draftGroupPoll };
