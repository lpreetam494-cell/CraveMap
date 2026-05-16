// Temporary script to make all localhost:5000 references dynamic for Render deployment
const fs = require('fs');

// === Fix bot.js ===
let bot = fs.readFileSync('./bot.js', 'utf8');

// Add API_PORT and API_BASE constants after dotenv config
bot = bot.replace(
  "require('dotenv').config({ path: path.join(__dirname, '.env') });",
  "require('dotenv').config({ path: path.join(__dirname, '.env') });\n\nconst API_PORT = process.env.PORT || 5000;\nconst API_BASE = 'http://localhost:' + API_PORT;"
);

// Fix interceptor
bot = bot.replace(
  "config.url.includes('localhost:5000')",
  "config.url.includes('localhost:' + API_PORT)"
);

// Replace all hardcoded http://localhost:5000 URLs
bot = bot.replaceAll("'http://localhost:5000", "API_BASE + '");

fs.writeFileSync('./bot.js', bot);
console.log('✅ bot.js: All localhost:5000 references made dynamic');

// === Fix lobby_manager.js ===
try {
  let lobby = fs.readFileSync('./skills/lobby_manager.js', 'utf8');
  lobby = lobby.replaceAll('http://localhost:5001', "' + API_BASE + '");
  // Actually simpler: just replace the hardcoded port
  lobby = fs.readFileSync('./skills/lobby_manager.js', 'utf8');
  lobby = lobby.replace(
    "axios.post('http://localhost:5001/api/group-decision'",
    "axios.post((process.env.API_BASE || 'http://localhost:5000') + '/api/group-decision'"
  );
  fs.writeFileSync('./skills/lobby_manager.js', lobby);
  console.log('✅ lobby_manager.js: Fixed hardcoded port');
} catch(e) {
  console.log('⚠️ lobby_manager.js: ' + e.message);
}

console.log('\n🎯 All ports are now dynamic. Ready for Render deployment.');
