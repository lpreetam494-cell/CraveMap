const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * Sovereign Weather Intelligence Service
 * Uses OpenWeatherMap for live environmental context.
 */

const getAmbientContext = async (location = 'San Francisco') => {
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    
    // Demo Mode Fallback if API Key is missing
    if (!API_KEY || API_KEY === 'YOUR_OPENWEATHER_API_KEY_HERE') {
        console.log("🌤️ Weather Service: API Key missing. Returning simulation context (Rain).");
        return {
            city: location,
            temp: 18,
            condition: 'Rain',
            description: 'simulated rain for demo',
            timestamp: new Date().toISOString()
        };
    }

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${API_KEY}&units=metric`;
        const response = await axios.get(url);
        const data = response.data;

        return {
            city: data.name,
            temp: data.main.temp,
            condition: data.weather[0].main, // e.g., 'Rain', 'Clear', 'Clouds'
            description: data.weather[0].description,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("❌ Weather Service Error:", error.message);
        return { city: location, condition: 'Unknown', temp: null };
    }
};

module.exports = { getAmbientContext };
