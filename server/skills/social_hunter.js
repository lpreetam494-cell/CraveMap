const Groq = require("groq-sdk");
const axios = require('axios');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
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

    // MULTIMODAL INGESTION ENGINE LOGIC
    if (text.includes("instagram.com") || text.includes("tiktok.com")) {
        console.log("⚡ Social Hunter: Video link detected. Spawning Python Ingestion Engine...");
        
        try {
            // Extract the URL from the text (assuming it might be mixed with text)
            const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
            const url = urlMatch ? urlMatch[0] : text;
            
            const pyPath = path.resolve(__dirname, '..', 'python_services', 'ingestion.py');
            const { stdout, stderr } = await execPromise(`python "${pyPath}" "${url}"`, {
                cwd: path.resolve(__dirname, '..', 'python_services')
            });
            
            if (stderr && !stdout.includes('{')) {
                console.log("⚡ Python Engine Stderr:", stderr);
            }
            
            // yt-dlp might print download progress or warnings to stdout. 
            // We must robustly find the JSON line by trying to parse from bottom to top.
            const lines = stdout.split('\n');
            let intel = null;
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i].trim();
                if (!line) continue;
                try {
                    intel = JSON.parse(line);
                    break; // Successfully found and parsed the JSON!
                } catch (e) {
                    // Not a valid JSON line, continue checking upwards
                }
            }
            
            if (!intel) {
                throw new Error("No JSON found in Python output. Output was: " + stdout);
            }
            
            if (intel.error) {
                console.error("❌ Python Engine Error:", intel.error);
                throw new Error(intel.error);
            }
            
            console.log("⚡ Social Hunter: Multimodal Extraction Success.", intel);
            
            // Map the new Sovereign keys to the required legacy keys for compatibility with index.js routing
            return {
                ...intel,
                name: intel.restaurant_name || "Unknown",
                area: intel.area_location || "Unknown",
                cuisine: intel.cuisine || "Unknown",
                vibe: intel.vibe_tags || "Unknown",
                budget: intel.budget_rating || null,
                meal_type: "unknown"
            };
        } catch (error) {
            const fullError = (error.message || "") + " " + (error.stderr || "") + " " + (error.stdout || "");
            console.error("❌ Ingestion Engine Error:", fullError, "\n-> Falling back to Groq processing");
            if (fullError.toLowerCase().includes("login required") || fullError.toLowerCase().includes("rate-limit") || fullError.toLowerCase().includes("cookie")) {
                return {
                    name: "Unknown",
                    error_msg: "Instagram's privacy shields blocked me from downloading the video. 🛡️\n\nTo enable Reel processing, export your Instagram cookies to a 'cookies.txt' file in the 'server/python_services' folder.\n\nAlternatively, just send me the name of the place or a Google Maps link!"
                };
            }
            
            if (fullError.toLowerCase().includes("gemini")) {
                let msg = "My AI visual cortex failed to process the video.";
                if (fullError.includes("503") || fullError.toLowerCase().includes("high demand") || fullError.toLowerCase().includes("unavailable")) {
                    msg = "Google Gemini is currently experiencing extremely high demand and returned a 503 Overloaded error. 🧠⏳\n\nSpikes are usually temporary. Please wait a few minutes and try sending the link again!";
                } else if (fullError.includes("429") || fullError.toLowerCase().includes("quota")) {
                    msg = "The Google Gemini API has hit its rate limit or quota. 🛑\n\nPlease try again later.";
                }
                return {
                    name: "Unknown",
                    error_msg: msg
                };
            }
            
            processText = text; // Proceed to Groq fallback if Python fails for some other completely unknown reason
        }
    }

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "Extract restaurant data from the message. Return JSON with: name, cuisine, area, budget (number), vibe, meal_type, high_intent (boolean), and socially_high_value (boolean). Set high_intent to true if the user expresses strong desire or uses modern slang (e.g. 'I NEED this', 'this spot is gas', 'no cap'). Set socially_high_value to true if the context implies group sharing."
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
            budget: 500,
            vibe: "Unknown",
            meal_type: "lunch",
            high_intent: false,
            socially_high_value: false
        };
    }
};

module.exports = { extractRestaurantData };
