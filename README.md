# CraveMap: Sovereign Food Intelligence
**Autonomous Multi-Agent Food Decision Engine**

Built for the **OpenClaw Hackathon (SRI-B)**.

## 🏆 Hackathon Deliverables
* 🎥 **[Demo Video]**(https://drive.google.com/file/d/1Ss2ewbnKvxpF1mWKK9G7tppZnbZOnD0H/view?usp=share_link)
* 📊 **[Pitch Deck (PPT)]**(https://docs.google.com/presentation/d/1SXqAJz16rSSHDPrJnFuVk6eR4O2a1V7s/edit?usp=share_link&ouid=112066600456945679222&rtpof=true&sd=true)
* 📝 **[AI Disclosure Form]**(https://docs.google.com/document/d/1m3gOn9kXvnv6nVWyuzBgIr6jbdx4Bc3J/edit?usp=share_link&ouid=112066600456945679222&rtpof=true&sd=true)

---

## 🌟 The Vision
CraveMap is a "Sovereign" food intelligence system. Unlike centralized platforms (Yelp, UberEats), CraveMap puts the intelligence in the user's hands. It watches your social inputs, learns your behavioral patterns, and proactively assists you—all while keeping your food memory private and local.

## 🧠 Multi-Agent Architecture
Powered by **OpenClaw Orchestration**:
1.  **Social Hunter**: Extracts structured metadata from raw Telegram/WhatsApp chats. *Upgraded with RapidAPI for direct Instagram scraping, protected by Simulation Fallbacks.*
2.  **Taste Alchemist**: Synthesizes craving cycles and historical preferences to suggest the perfect meal. *Upgraded with Tavily Search API to handle Cold-Start queries.*
3.  **Lifestyle Operator**: Monitors environmental context (Weather/Time) and executes proactive actions (Group Polls/Alerts).

## 🛡️ The Hackathon "Safety Net"
To guarantee a flawless demo, the system is designed defensively. If the RapidAPI or Tavily keys are missing, or if stage Wi-Fi drops, the agents seamlessly transition into "Simulation Mode," utilizing rich, hardcoded fallback data without breaking the Telegram UX.

---

## 🚀 Setup Instructions

### 1. Environment Configuration
Create/Update the `.env` file in the `/server` directory:
```bash
GROQ_API_KEY=your_groq_key
TELEGRAM_BOT_TOKEN=your_bot_token
OPENWEATHER_API_KEY=your_weather_key
TAVILY_API_KEY=your_tavily_key
RAPIDAPI_KEY=your_rapidapi_key
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

#Here is a refined, direct version of your workflows and privacy protocols, structured for maximum clarity and technical precision.

---

## ⚙️ Core Operational Workflows

### 1. The "Signal Capture" Pipeline

* **Interaction:** Direct message your Telegram interface with a raw recommendation (e.g., *"Try Oasi Vegan Japanese; their spicy ramen in the Mission is elite."*)
* **Processing:** The **OpenClaw Engine** parses the unstructured text, scrapes relevant metadata (location coordinates, dish tags, flavor profiles), and commits the structured data to your local knowledge base.
* **Verification:** You can monitor live extraction logs via the "Operations Feed" on your primary dashboard.

### 2. Contextual Logic & Automation

* **Environmental Triggers:** The system continuously polls external APIs (e.g., OpenWeather).
* **Autonomous Execution:** If environmental conditions shift—such as a sudden rainstorm—the **Lifestyle Operator** cross-references weather data with your stored preferences.
* **Outcome:** The system proactively pushes a high-relevance suggestion, like "Rainy Day Ramen," directly to your interface without manual prompting.

### 3. Multi-User Conflict Resolution

* **Navigation:** Access the **Groups** module to manage collective decisions.
* **The "Lock It In" Protocol:** When a group is undecided, the agent analyzes individual constraints and preferences to resolve friction points.
* **Deployment:** The system generates a optimized decision poll designed to reach a consensus rapidly.

---

## 🔐 Data Architecture & User Autonomy

CraveMap operates on a **Local-First Sovereignty Model**.

### The Sovereign Data Vault

* **Physical Storage:** Your culinary history is stored exclusively in a `food_memory.json` file residing on your local hardware.
* **Zero Centralization:** No behavioral data is transmitted to or stored on a centralized cloud server.
* **Full Command:** You maintain absolute "right-to-erase" capabilities. Purging the local cache immediately and permanently deletes your entire footprint, ensuring you remain the sole owner of your digital memory.

---

**Note for the Developer:** Ensure that the `food_memory.json` file is regularly backed up, as local-only storage means data recovery is impossible once the cache is purged or the hardware is compromised. Use clear, direct labels in the UI to reflect this "Sovereign" responsibility.