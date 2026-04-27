const { Telegraf } = require('telegraf');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

console.log("🤖 Sovereign Bot: Initializing...");

bot.start((ctx) => {
    ctx.reply("Welcome to CraveMap Sovereign. Send me a restaurant name, a link, or a location to save it to your food brain.");
});

bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    console.log(`💬 Bot received: "${text}"`);
    
    ctx.reply("⚡ Agent Social Hunter is processing your request...");

    try {
        const response = await axios.post('http://localhost:5000/api/save', { text });
        
        if (response.data.success) {
            const entry = response.data.entry;
            ctx.reply(`📍 Saved to Sovereign Bucket!\n\nName: ${entry.name}\nCuisine: ${entry.cuisine}\nArea: ${entry.area}\n\nCheck your dashboard for behavioral insights.`);
        }
    } catch (error) {
        console.error("❌ Bot Error:", error.message);
        ctx.reply("⚠️ Sorry, I couldn't process that. Make sure the CraveMap server is running.");
    }
});

bot.launch()
    .then(() => console.log("🚀 Sovereign Bot is LIVE on Telegram"))
    .catch((err) => console.error("❌ Bot failed to launch:", err.message));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
