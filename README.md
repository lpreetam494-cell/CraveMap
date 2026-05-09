## CraveMap: Sovereign Food Intelligence

**Autonomous Multi-Agent Food Decision Engine**

Engineered for the **OpenClaw Hackathon (SRI-B)**.

---

### 🚀 Deliverables & Documentation

* 🎥 **[Performance Demo]**([https://drive.google.com/file/d/1Ss2ewbnKvxpF1mWKK9G7tppZnbZOnD0H/view?usp=share_link]()) — See the agents in action.
* 📊 **[Strategic Pitch Deck]**([https://docs.google.com/presentation/d/1SXqAJz16rSSHDPrJnFuVk6eR4O2a1V7s/edit?usp=share_link&ouid=112066600456945679222&rtpof=true&sd=true]()) — Market vision and technical roadmap.
* 📝 **[AI Transparency Disclosure]**([https://docs.google.com/document/d/1m3gOn9kXvnv6nVWyuzBgIr6jbdx4Bc3J/edit?usp=share_link&ouid=112066600456945679222&rtpof=true&sd=true]()) — Full model and data attribution.

---

### 🌐 The Vision

CraveMap reclaims the "food decision" from centralized giants like Yelp or UberEats. By shifting intelligence to the edge, CraveMap operates as a private, local-first brain that decodes your social interactions and behavioral rhythms to provide proactive recommendations while maintaining absolute data sovereignty.

### ⚙️ Multi-Agent Orchestration

The system utilizes **OpenClaw** to manage three specialized agents:

1. **Social Hunter**: Parses unstructured data from Telegram and WhatsApp into structured metadata. It features an **Instagram Scraping Pipeline** via RapidAPI, supported by simulation logic to ensure high reliability.
2. **Taste Alchemist**: A predictive engine that maps craving cycles and historical data. It integrates the **Tavily Search API** to resolve "Cold-Start" scenarios, ensuring the engine has answers even when personal data is sparse.
3. **Lifestyle Operator**: The execution layer. It monitors external variables like current weather and time to trigger proactive workflows, such as automated group polls or context-aware dining alerts.

---

### 🛡️ Resilience & Demo Integrity

To eliminate the risk of live-demo failure, CraveMap employs a **Defensive Architectural Fail-Safe**. If the system detects API latency, missing credentials, or network instability, the agents automatically switch to **Simulation Mode**. This ensures the Telegram UX remains fluid and responsive by serving high-fidelity fallback data without a single break in logic.
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