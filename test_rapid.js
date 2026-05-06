const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

async function testRapidAPI() {
    try {
        const response = await axios.get('https://instagram-scraper-api2.p.rapidapi.com/v1/post_info', {
            params: { code_or_id_or_url: 'https://www.instagram.com/reel/DUpWu--EUiQ/' },
            headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY }
        });
        console.log(JSON.stringify(response.data.data, null, 2));
    } catch (error) {
        console.error("RapidAPI Error:", error.message);
    }
}
testRapidAPI();
