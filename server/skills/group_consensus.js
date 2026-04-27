/**
 * Advanced Group Consensus Engine Skill
 * Calculates Harmony and Friction metrics for Cuisine, Distance, and Budget.
 */

const calculateAdvancedMetrics = (restaurant, groupPrefs) => {
    let cuisineScores = [];
    let budgetScores = [];
    let distanceScores = [];

    groupPrefs.forEach(pref => {
        // Cuisine Friction
        const hasCuisine = restaurant.cuisine && pref.preferredCuisines.some(c => 
            restaurant.cuisine.toLowerCase().includes(c.toLowerCase())
        );
        cuisineScores.push(hasCuisine ? 1 : 0);

        // Budget Friction
        const restBudget = parseInt(restaurant.budget);
        const withinBudget = restBudget <= pref.maxBudget;
        budgetScores.push(withinBudget ? 1 : 0);

        // Distance Friction
        const withinDistance = restaurant.distance <= pref.maxDistance;
        distanceScores.push(withinDistance ? 1 : 0);
    });

    const average = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
        cuisine_harmony: Math.round(average(cuisineScores) * 100),
        budget_harmony: Math.round(average(budgetScores) * 100),
        distance_harmony: Math.round(average(distanceScores) * 100),
        overall_harmony: Math.round(average([...cuisineScores, ...budgetScores, ...distanceScores]) * 100)
    };
};

const findBestRestaurant = (restaurants, groupPrefs) => {
    const results = restaurants.map(r => {
        const metrics = calculateAdvancedMetrics(r, groupPrefs);
        return { ...r, ...metrics };
    });

    results.sort((a, b) => b.overall_harmony - a.overall_harmony);

    return {
        best_option: results[0],
        topology: {
            cuisine: results[0].cuisine_harmony,
            budget: results[0].budget_harmony,
            distance: results[0].distance_harmony,
            friction_points: [
                results[0].cuisine_harmony < 50 ? "High Cuisine Friction" : null,
                results[0].budget_harmony < 50 ? "High Budget Friction" : null,
                results[0].distance_harmony < 50 ? "High Distance Friction" : null
            ].filter(Boolean)
        },
        reasoning: `Selected based on ${results[0].overall_harmony}% group harmony. Budget alignment is strong, resolving the primary conflict.`
    };
};

module.exports = { findBestRestaurant };
