/**
 * CraveMap Sovereign — Combined Entry Point for Cloud Deployment
 * Starts both the Express API (Brain) and the Telegram Bot (Agent)
 */

console.log('🚀 CraveMap Sovereign: Starting unified deployment...\n');

// Start the Express API server first
require('./index.js');

// Give the API 2 seconds to bind, then start the bot
setTimeout(() => {
    console.log('\n🤖 Starting Telegram Bot...');
    require('./bot.js');
}, 2000);
