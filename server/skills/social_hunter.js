const Groq = require("groq-sdk");
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const extractRestaurantData = async (text) => {
    // Demo Mode Fallback if API Key is missing
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'YOUR_GROQ_API_KEY') {
        console.log("⚡ Social Hunter: GROQ_API_KEY missing. Running in Simulation Mode.");
        return {
            name: "Rameshwaram Cafe",
            cuisine: "South Indian Breakfast",
            area: "Brookefield",
            budget: 200,
            vibe: "Bustling / Heritage",
            meal_type: "breakfast"
        };
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    let processText = text;

    // RAPIDAPI INSTAGRAM SCRAPER LOGIC
    if (text.includes("instagram.com")) {
        console.log("⚡ Social Hunter: Instagram link detected. Attempting RapidAPI Scrape...");
        
        if (!process.env.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY === 'YOUR_RAPIDAPI_KEY') {
            console.log("⚡ Social Hunter: RAPIDAPI_KEY missing. Using Safe Fallback Caption.");
            processText = "This is a great spot for South Indian Breakfast in Brookefield for around 200 rs. It gets very bustling! #RameshwaramCafe";
        } else {
            try {
                // Real RapidAPI call would go here
                const response = await axios.get('https://instagram-scraper-api2.p.rapidapi.com/v1/post_info', {
                    params: { code_or_id_or_url: text },
                    headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY },
                    timeout: 3000 // Strict 3 second timeout for stage demo safety
                });
                processText = response.data.data.caption.text;
                console.log("⚡ Social Hunter: RapidAPI Success. Extracted caption.");
            } catch (error) {
                console.error("❌ RapidAPI Error:", error.message, "-> Falling back to Safe Caption");
                processText = "Just had the best Biryani at Meghana Foods in Koramangala! Cost was 350, casual vibe.";
            }
        }
    }

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "Extract restaurant data from the message. Return JSON with: name, cuisine, area, budget (number), vibe, and meal_type. If missing, use null."
                },
                {
                    role: "user",
                    content: processText
                }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        return JSON.parse(chatCompletion.choices[0].message.content);
    } catch (error) {
        console.error("Error in Social Hunter Agent:", error);
        // Fallback for demo if no API key
        return {
            name: "Extracted Spot",
            cuisine: "Unknown",
            area: "Local",
            budget: 500,
            vibe: "Unknown",
            meal_type: "lunch"
        };
    }
};

module.exports = { extractRestaurantData };
