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
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "Extract restaurant data from the message. Return JSON with: name, cuisine, area, budget (number), vibe, and meal_type. If missing, use null."
                },
                {
                    role: "user",
                    content: text
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
