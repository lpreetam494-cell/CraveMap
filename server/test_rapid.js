const axios = require('axios');
require('dotenv').config({ path: './.env' });

async function testRapidAPI() {
    try {
        const response = await axios.get('https://instagram-scraper-api2.p.rapidapi.com/v1/post_info', {
            params: { code_or_id_or_url: 'https://www.instagram.com/reel/DUpWu--EUiQ/' },
            headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY }
        });
        console.log("Caption:", response.data.data.caption.text);
        console.log("Video URL:", response.data.data.video_url);
    } catch (error) {
        console.error("RapidAPI Error:", error.message);
    }
}
testRapidAPI();
