const axios = require('axios');
const Groq = require("groq-sdk");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * Sovereign Weather Intelligence Service
 * Uses Tavily Search API + Groq for live environmental context.
 */

const getAmbientContext = async (location = 'San Francisco') => {
    const TAVILY_KEY = process.env.TAVILY_API_KEY;
    const GROQ_KEY = process.env.GROQ_API_KEY;
    
    // Demo Mode Fallback if API Key is missing
    if (!TAVILY_KEY || TAVILY_KEY === 'YOUR_TAVILY_KEY_HERE') {
        console.log("🌤️ Weather Service: Tavily API Key missing. Returning simulation context (Rain).");
        return {
            city: location,
            temp: 18,
            condition: 'Rain',
            description: 'simulated rain for demo',
            timestamp: new Date().toISOString()
        };
    }

    try {
        // 1. Get raw weather text from Tavily
        const searchResponse = await axios.post('https://api.tavily.com/search', {
            api_key: TAVILY_KEY,
            query: `current weather condition and temperature in Celsius for ${location}`,
            include_answer: true,
            search_depth: "basic"
        });
        
        const answer = searchResponse.data.answer;
        
        // 2. Synthesize to structured JSON using Groq
        const groq = new Groq({ apiKey: GROQ_KEY });
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "Extract weather data from the text. Return strictly JSON with: city, temp (number in Celsius), condition (e.g. 'Rain', 'Clear', 'Clouds', 'Snow', 'Wind'), description (short summary)."
                },
                {
                    role: "user",
                    content: answer || `Weather data for ${location} unavailable.`
                }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        const data = JSON.parse(chatCompletion.choices[0].message.content);

        return {
            city: data.city || location,
            temp: data.temp || null,
            condition: data.condition || 'Unknown',
            description: data.description || 'No detailed description',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("❌ Weather Service Error:", error.message);
        return { city: location, condition: 'Unknown', temp: null };
    }
};

module.exports = { getAmbientContext };
