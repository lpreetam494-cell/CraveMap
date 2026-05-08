/**
 * Lifestyle Operator Agent Skill
 * Handles actions, triggers, communication, and environmental context.
 */
const { getAmbientContext } = require('./weather_service');

const getProactiveTriggers = async (memory) => {
    const weather = await getAmbientContext('Bangalore'); // Defaulting to Bangalore for demo
    const triggers = [];
    const now = new Date();
    const hour = now.getHours();
    
    // 1. Weather Trigger: Rainy/Cold Day Comfort
    if (weather.condition.toLowerCase().includes('rain') || weather.temp < 20) {
        triggers.push({
            type: 'CONTEXT_SYNC',
            title: 'Cozy Weather',
            message: `It's currently ${weather.temp}°C and ${weather.condition} outside. Prioritizing warm and cozy spots.`,
            tags: ['soup', 'ramen', 'cozy', 'warm', 'cafe']
        });
    }

    // 2. Time-of-Day Logic
    let timeVibe = 'any';
    if (now.getDay() === 5 && hour >= 17) {
        timeVibe = 'friday_night';
        triggers.push({
            type: 'TIME_CONTEXT',
            message: "It's Friday night! Suggesting lively places, breweries, or nice dinners.",
            tags: ['lively', 'brewery', 'date', 'rooftop', 'weekend']
        });
    } else if (hour >= 11 && hour <= 14) {
        timeVibe = 'quick_lunch';
        triggers.push({
            type: 'TIME_CONTEXT',
            message: "Workday lunch. Suggesting quick and budget-friendly spots.",
            tags: ['quick', 'casual', 'budget', 'lunch']
        });
    }

    return { weather, triggers, timeVibe };
};

const enforceVariety = (restaurants) => {
    // Look at the last 3 visited spots
    const visited = restaurants.filter(r => r.visited).sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at)).slice(0, 3);
    
    const penaltyMap = {};
    
    // If the last 3 visited spots all have the same cuisine, apply a heavy penalty
    if (visited.length >= 3) {
        const cuisines = visited.map(r => r.cuisine?.toLowerCase()).filter(Boolean);
        const allSame = cuisines.every(c => c === cuisines[0]);
        if (allSame && cuisines[0]) {
            penaltyMap[cuisines[0]] = -2.0; // Penalty multiplier for Taste Fatigue
        }
    }
    
    return penaltyMap;
};

module.exports = { getProactiveTriggers, enforceVariety };
