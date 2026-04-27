/**
 * Taste Alchemist Agent Skill
 * Generates recommendations based on history and current context.
 */

const getRecommendation = (memory, context) => {
    const { restaurants, craving_patterns, visit_history } = memory;
    const { time, weather, location, budget } = context;

    // 1. Filter by Budget and Location (if provided)
    let candidates = restaurants.filter(r => !r.visited);
    
    if (budget) {
        candidates = candidates.filter(r => parseInt(r.budget) <= budget);
    }
    
    if (location) {
        candidates = candidates.filter(r => r.area.toLowerCase() === location.toLowerCase());
    }

    // 2. Cross-reference with Craving Cycles
    // If Biryani is overdue, prioritize it
    const biryaniPattern = craving_patterns.biryani;
    const today = new Date();
    const lastHad = new Date(biryaniPattern.last_had);
    const diffDays = Math.ceil((today - lastHad) / (1000 * 60 * 60 * 24));

    if (diffDays >= biryaniPattern.avg_cycle_days) {
        const biryaniSpots = candidates.filter(r => r.cuisine.toLowerCase().includes('biryani'));
        if (biryaniSpots.length > 0) {
            candidates = biryaniSpots; // Prioritize overdue cravings
        }
    }

    // 3. Select Top 3
    const results = candidates.slice(0, 3);

    if (results.length === 0) {
        return {
            best_option: null,
            backups: [],
            reasoning: "No unvisited spots match your current context. Maybe try a new area?"
        };
    }

    return {
        best_option: results[0],
        backups: results.slice(1),
        reasoning: `Based on your ${diffDays}-day biryani craving cycle, it's the perfect time for ${results[0].name}.`
    };
};

module.exports = { getRecommendation };
