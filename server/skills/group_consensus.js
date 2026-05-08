/**
 * Advanced Group Consensus Engine Skill
 * Calculates Harmony and Friction metrics for Cuisine, Distance, and Budget.
 */
const axios = require('axios');
const { calculateTravelTime } = require('./location_service');

const calculateAdvancedMetrics = (restaurant, groupPrefs) => {
    let cuisineScores = [];
    let budgetScores = [];
    let distanceScores = [];

const findBestRestaurant = async (payloadObj) => {
    try {
        console.log('📡 Calling FastAPI Social Brain microservice...');
        
        // Phase 4: Location Intelligence
        // If the host has coordinates, calculate travel times for all restaurants
        if (payloadObj.host_restaurants && payloadObj.host_restaurants.length > 0) {
            // Mocking host origin as Central Bangalore for demo if not provided
            const originLat = payloadObj.origin_lat || 12.9716;
            const originLng = payloadObj.origin_lng || 77.5946;
            
            const travelTimes = await calculateTravelTime(originLat, originLng, payloadObj.host_restaurants);
            
            // Merge travel times into host_restaurants
            payloadObj.host_restaurants = payloadObj.host_restaurants.map(r => {
                const tt = travelTimes.find(t => t.restaurant_id === r.id);
                return { ...r, distance_km: tt ? tt.distance_km : null, duration_mins: tt ? tt.duration_mins : null };
            });
        }

        const response = await axios.post(
            `${FASTAPI_ENDPOINT}/process-social-brain`,
            payloadObj,
            { timeout: 5000 }
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
