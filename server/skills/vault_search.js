const Groq = require("groq-sdk");
const path = require("path");
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const parseSearchQuery = async (query) => {
    // Demo Fallback
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'YOUR_GROQ_API_KEY') {
        return { vibe: "rooftop" }; 
    }

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an AI assistant helping to filter a JSON database. 
                    Convert the user's natural language search query into a strict JSON filter object.
                    Possible keys: 'cuisine', 'area', 'vibe', 'budget', 'meal_type'.
                    Only include keys that are explicitly mentioned or strongly implied.
                    Return ONLY the JSON object. Example: User asks for 'cheap rooftop spots in Indiranagar', return {"vibe": "rooftop", "area": "Indiranagar", "budget": 500}.`
                },
                {
                    role: "user",
                    content: query
                }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            temperature: 0.1
        });

        return JSON.parse(chatCompletion.choices[0].message.content);
    } catch (error) {
        console.error("❌ Groq Search Parser Error:", error);
        return {};
    }
};

const searchVault = async (query, memory) => {
    const filters = await parseSearchQuery(query);
    console.log("⚡ Vault Search Filters Extracted:", filters);
    
    if (Object.keys(filters).length === 0) {
        return { filters: {}, results: memory.restaurants.slice(0, 5) }; // return recents if failed
    }

    let results = memory.restaurants;

    if (filters.area) {
        results = results.filter(r => r.area && r.area.toLowerCase().includes(filters.area.toLowerCase()));
    }
    if (filters.cuisine) {
        results = results.filter(r => r.cuisine && r.cuisine.toLowerCase().includes(filters.cuisine.toLowerCase()));
    }
    if (filters.vibe) {
        results = results.filter(r => r.vibe && r.vibe.toLowerCase().includes(filters.vibe.toLowerCase()));
    }
    if (filters.meal_type) {
        results = results.filter(r => r.meal_type && r.meal_type.toLowerCase() === filters.meal_type.toLowerCase());
    }
    if (filters.budget) {
        results = results.filter(r => r.budget && parseInt(r.budget) <= parseInt(filters.budget));
    }

    return { filters, results };
};

module.exports = { searchVault };
