const Groq = require("groq-sdk");
const axios = require('axios');
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');
const execFilePromise = util.promisify(execFile);
const { resolveGeocoordinates } = require('./location_service');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const enrichRestaurantData = async (extractedData, groq) => {
    // If name is unknown, we cannot geocode or enrich effectively
    if (!extractedData.name || extractedData.name === "Unknown") return extractedData;
    
    const isMissing = (val) => !val || val === "Unknown" || val === "null";
    const needsEnrichment = isMissing(extractedData.cuisine) || isMissing(extractedData.area) || isMissing(extractedData.vibe) || isMissing(extractedData.budget);
    
    if (!needsEnrichment) {
        const geo = await resolveGeocoordinates(extractedData.name, extractedData.area);
        return { ...extractedData, ...geo };
    }
    
    if (!process.env.TAVILY_API_KEY || process.env.TAVILY_API_KEY === 'YOUR_TAVILY_API_KEY') {
        console.log("⚡ Social Hunter: TAVILY_API_KEY missing. Skipping web enrichment.");
        const geo = await resolveGeocoordinates(extractedData.name, extractedData.area);
        return { ...extractedData, ...geo };
    }

    console.log(`⚡ Social Hunter: Enriching missing data for "${extractedData.name}" via Web Search...`);
    
    try {
        const query = `${extractedData.name} restaurant details cuisine vibe price area`;
        const searchResponse = await axios.post('https://api.tavily.com/search', {
            api_key: process.env.TAVILY_API_KEY,
            query: query,
            search_depth: "basic",
            max_results: 3
        });
        
        const snippets = searchResponse.data.results.map(r => r.content).join("\n\n");
        
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a data enrichment agent. I will give you a restaurant's partial data and some web search snippets. Fill in the missing fields (cuisine, area, budget, vibe) based on the snippets. Keep existing valid data intact. Return JSON with exact keys: name, cuisine, area, budget, vibe, meal_type, high_intent, socially_high_value. Make 'budget' a number (e.g., 500, 1000)."
                },
                {
                    role: "user",
                    content: `Original Data:\n${JSON.stringify(extractedData, null, 2)}\n\nWeb Search Snippets:\n${snippets}`
                }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        const enriched = JSON.parse(completion.choices[0].message.content);
        console.log(`✅ Enrichment complete for "${extractedData.name}"`);
        
        // Merge the results, prioritizing the enriched data for missing fields
        const finalData = {
            ...extractedData,
            cuisine: isMissing(extractedData.cuisine) ? enriched.cuisine : extractedData.cuisine,
            area: isMissing(extractedData.area) ? enriched.area : extractedData.area,
            vibe: isMissing(extractedData.vibe) ? enriched.vibe : extractedData.vibe,
            budget: isMissing(extractedData.budget) ? enriched.budget : extractedData.budget
        };

        const geo = await resolveGeocoordinates(finalData.name, finalData.area);
        return { ...finalData, ...geo };

    } catch (e) {
        console.error("❌ Enrichment failed:", e.message);
        const geo = await resolveGeocoordinates(extractedData.name, extractedData.area);
        return { ...extractedData, ...geo };
    }
};

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
        
        try {
            // Extract the URL from the text (assuming it might be mixed with text)
            const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
            const url = urlMatch ? urlMatch[0] : text;
            
            const pyPath = path.resolve(__dirname, '..', 'python_services', 'ingestion.py');
            const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
            const { stdout, stderr } = await execFilePromise(pythonCmd, [pyPath, url], {
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
            let finalIntel = {
                ...intel,
                name: intel.restaurant_name || "Unknown",
                area: intel.area_location || "Unknown",
                cuisine: intel.cuisine || "Unknown",
                vibe: intel.vibe_tags || "Unknown",
                budget: intel.budget_rating || null,
                meal_type: "unknown"
            };
            
            return await enrichRestaurantData(finalIntel, groq);
        } catch (error) {
            const fullError = (error.message || "") + " " + (error.stderr || "") + " " + (error.stdout || "");
            console.error("❌ Ingestion Engine Error:", fullError, "\n-> Falling back to Groq processing");
            
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
            
            if (fullError.toLowerCase().includes("login required") || fullError.toLowerCase().includes("rate-limit") || fullError.toLowerCase().includes("cookie")) {
                console.log("⚡ Instagram auth blocked. No fallback available.");
                return {
                    name: "Unknown",
                    error_msg: `🛡️ Instagram Reel Processing Blocked\n\n**Alternatives:**\n` +
                              `📸 Upload a photo of the dish or restaurant\n` +
                              `📝 Send me the restaurant name directly\n` +
                              `🗺️ Share a Google Maps link`
                };
            }
            
            // Instagram processing failed and no specific error matched
            if (text.includes("instagram.com")) {
                console.log("📸 Instagram link received but video extraction blocked");
                return {
                    name: "Unknown",
                    error_msg: `🛡️ Instagram Reel Processing Blocked\n\n**Alternatives:**\n` +
                              `📸 Upload a photo of the dish or restaurant\n` +
                              `📝 Send me the restaurant name directly\n` +
                              `🗺️ Share a Google Maps link`
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

        const baseResult = JSON.parse(chatCompletion.choices[0].message.content);
        return await enrichRestaurantData(baseResult, groq);
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
