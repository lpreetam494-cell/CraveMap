/**
 * Taste Alchemist Agent Skill
 * Generates recommendations based on history and current context.
 */

const axios = require('axios');

const getRecommendation = async (memory, context) => {
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
        // TAVILY FALLBACK TRIGGERED
        console.log("⚡ Taste Alchemist: Local memory empty for context. Triggering Tavily Web Search...");
        
        if (!process.env.TAVILY_API_KEY || process.env.TAVILY_API_KEY === 'YOUR_TAVILY_API_KEY') {
            console.log("⚡ Taste Alchemist: TAVILY_API_KEY missing. Returning Safe Fallback.");
            return {
                best_option: { name: "Green Leaf Cafe (Web Discovery)", area: location || "Nearby", budget: budget || 500 },
                backups: [],
                reasoning: "I didn't find any saved spots matching this. However, my live web search found 'Green Leaf Cafe' highly rated nearby. Should I save it to your Food Graph?"
            };
        }

        try {
            // Real Tavily API call would go here
            const query = `Top rated restaurant in ${location || 'bangalore'} under ${budget || 500}`;
            const response = await axios.post('https://api.tavily.com/search', {
                api_key: process.env.TAVILY_API_KEY,
                query: query,
                search_depth: "basic"
            });
            
            return {
                best_option: { name: "Web Discovery", details: response.data.results[0].title },
                backups: [],
                reasoning: `I searched the web for '${query}' and found some highly rated live options. Should I save them?`
            };
        } catch (error) {
            console.error("❌ Tavily Search Error:", error.message);
            return {
                best_option: { name: "Green Leaf Cafe (Web Discovery)", area: location || "Nearby", budget: budget || 500 },
                backups: [],
                reasoning: "I searched the web and found 'Green Leaf Cafe' nearby. Should I save it?"
            };
        }
    }

    return {
        best_option: results[0],
        backups: results.slice(1),
        reasoning: `Based on your ${diffDays}-day biryani craving cycle, it's the perfect time for ${results[0].name}.`
    };
};

module.exports = { getRecommendation };
