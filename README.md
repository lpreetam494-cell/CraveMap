# CraveMap: Sovereign Food Intelligence
**Autonomous Multi-Agent Food Decision Engine**

Built for the **OpenClaw Hackathon (SRI-B)**.

---

## 🌟 The Vision
CraveMap is a "Sovereign" food intelligence system. Unlike centralized platforms (Yelp, UberEats), CraveMap puts the intelligence in the user's hands. It watches your social inputs, learns your behavioral patterns, and proactively assists you—all while keeping your food memory private and local.

## 🧠 Multi-Agent Architecture
Powered by **OpenClaw Orchestration**:
1.  **Social Hunter**: Extracts structured metadata from raw Telegram/WhatsApp chats and social links.
2.  **Taste Alchemist**: Synthesizes craving cycles and historical preferences to suggest the perfect meal.
3.  **Lifestyle Operator**: Monitors environmental context (Weather/Time) and executes proactive actions (Group Polls/Alerts).

---

## 🚀 Setup Instructions

### 1. Environment Configuration
Create/Update the `.env` file in the `/server` directory:
```bash
GROQ_API_KEY=your_groq_key
TELEGRAM_BOT_TOKEN=your_bot_token
OPENWEATHER_API_KEY=your_weather_key
```

### 2. Install Dependencies
```bash
# Server
cd server && npm install

# Canvas (Frontend)
cd canvas && npm install
```

### 3. Launching the Sovereign System
You need to run three components:
```bash
# Terminal 1: The Brain (API Server)
cd server && node index.js

# Terminal 2: The Mouth (Telegram Bot)
cd server && node bot.js

# Terminal 3: The Eyes (Dashboard)
cd canvas && npm run dev
```

---

## 🧪 Demo Workflows

### A. The "Social Hunter" Extraction
1.  Open your Telegram Bot.
2.  Send: *"Check out Oasi Vegan Japanese, it's in the Mission and has great spicy ramen."*
3.  **Watch the Dashboard**: The "OpenClaw Operations" feed will light up as the agent extracts metadata and saves it to your brain.

### B. Proactive Intelligence
1.  The agent monitors the weather.
2.  If the Weather API detects rain, the **Lifestyle Operator** will push a "Rainy Day Ramen" insight to your dashboard autonomously.

### C. Group Consensus
1.  Navigate to the **Groups** tab.
2.  Click **"Lock It In"**.
3.  The agent resolves conflicts between members and drafts a real-world decision poll.

---

## 🛡️ Sovereignty & Privacy
CraveMap implements the **Sovereign Data Vault**. Your food memory is stored in `food_memory.json` on your hardware. You can purge this cache at any time, ensuring no centralized entity owns your behavioral data.
