const axios = require('axios');
const Groq = require("groq-sdk");
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const discoverRestaurants = async (area) => {
    let rawData = [];
    
    console.log(`⚡ Discovery Agent: Querying Nominatim for coordinates of '${area}'...`);
    
    try {
        // Step 1: Use Nominatim to resolve the exact coordinates of the area to prevent broad/inaccurate matches
        const nomRes = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: { q: `${area}, Bangalore`, format: 'json', limit: 1 },
            headers: { 'User-Agent': 'CraveMap-Sovereign-Agent/1.0' }
        });
        
        if (nomRes.data.length > 0) {
            const { lat, lon } = nomRes.data[0];
            console.log(`⚡ Discovery Agent: Resolved ${area} to Lat: ${lat}, Lon: ${lon}. Querying Overpass...`);
            
            // Step 2: Use Overpass 'around' query for high accuracy within a 2000m radius
            const query = `
                [out:json];
                nwr["amenity"="restaurant"](around:2000,${lat},${lon});
                out center;
            `;
            
            const overpassRes = await axios.get('https://overpass-api.de/api/interpreter', {
                params: { data: query },
                headers: { 'User-Agent': 'CraveMap-Sovereign-Agent/1.0' }
            });
            
            if (overpassRes.data && overpassRes.data.elements) {
                // Slice up to 20 to give the user "a lot of restaurants" as requested
                rawData = overpassRes.data.elements
                    .filter(el => el.tags && el.tags.name)
                    .slice(0, 20)
                    .map(el => {
                        return {
                            name: el.tags.name,
                            cuisine: el.tags.cuisine || "Mixed/Various",
                            rating: el.tags.rating || "Not specified"
                        };
                    });
                
                // Deduplicate names just in case
                rawData = rawData.filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i);
            }
        } else {
            console.log(`❌ Discovery Agent: Nominatim couldn't find coordinates for ${area}.`);
        }
    } catch (error) {
        console.error("❌ Discovery Agent: Geographic API Error:", error.message);
    }

    // Synthesize using Groq
    try {
        if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'YOUR_GROQ_API_KEY') {
            return `🍽️ **Discovery Agent**\nHere are some great spots in ${area}:\n1. Rameshwaram Cafe\n2. Truffles\n3. Meghana Foods`;
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        
        let promptContext = "";
        if (rawData.length > 0) {
            promptContext = `I found these ${rawData.length} accurate live results from OpenStreetMap within 2km of ${area}: ${JSON.stringify(rawData)}. Please format them nicely as a comprehensive list for a Telegram message. Include as many of them as possible (at least 10 if available) to give the user plenty of options. Mention the cuisine if available.`;
        } else {
            promptContext = `The live map search didn't return specific results for '${area}'. As an AI assistant, suggest a large, comprehensive list (10+ if possible) of popular restaurants that are likely to be found in or very close to ${area}, Bangalore. Format it beautifully for Telegram.`;
        }

        console.log(`⚡ Discovery Agent: Generating response with Groq for ${rawData.length} restaurants...`);
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are the CraveMap Discovery Agent. Your job is to format restaurant recommendations beautifully for Telegram using markdown. Keep it engaging, friendly, and provide a generous number of accurate options."
                },
                {
                    role: "user",
                    content: promptContext
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7
        });

        return chatCompletion.choices[0].message.content;
    } catch (error) {
        console.error("❌ Discovery Agent: Groq Error:", error.message);
        return `🍽️ **Discovery Agent**\nLooks like I'm having trouble connecting right now, but you should definitely explore the main street in ${area} for some great local spots!`;
    }
};

module.exports = { discoverRestaurants };
