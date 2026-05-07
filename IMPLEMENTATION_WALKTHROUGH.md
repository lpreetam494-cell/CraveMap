# CraveMap: Complete Implementation Walkthrough
**Sovereign Food Intelligence System - Hackathon MVP Status**

---

## 📌 Project Overview
CraveMap is an **autonomous multi-agent food decision engine** that puts intelligence in the user's hands. Unlike centralized platforms (Yelp, UberEats), CraveMap learns personal behavioral patterns, watches social inputs, and keeps your food memory **private and local**.

**Architecture:** Multi-agent orchestration powered by **OpenClaw + Groq (Llama 3)**, with Python mathematical engines for consensus.

---

## 🏗️ PART 1: BACKEND ARCHITECTURE

### A. Core Services Layer

#### **1. API Server** (`server/index.js`)
- **Framework:** Express.js + Socket.io
- **Port:** 5001
- **Features:**
  - RESTful endpoints for all agent orchestrations
  - WebSocket support for real-time agent thoughts streaming
  - CORS enabled for frontend communication
  - Memory persistence to JSON files

**Key Endpoints:**
```
GET  /api/memory                    → Fetch full food brain state
GET  /api/users                      → List all onboarded users
POST /api/save                       → Save restaurant (Social Hunter)
POST /api/recommend                  → Get recommendations (Taste Alchemist)
POST /api/discover                   → Scout new restaurants (Discovery Agent)
POST /api/group-decision             → Consensus engine (Group Consensus)
POST /api/verify-visit               → AI-powered photo verification
POST /api/search-vault               → Natural language vault search
POST /api/save-discovery             → Save discovered restaurants
GET  /api/agency-state               → Get proactive agency triggers
POST /api/trigger-agency             → Manual agency daemon invocation
```

#### **2. Telegram Bot Server** (`server/bot.js`)
- **Framework:** Telegraf (Telegram Bot API wrapper)
- **Token:** Loaded from `.env`
- **Features:**
  - Real-time Telegram message listener
  - Inline keyboard interactions (buttons/callbacks)
  - Photo upload processing
  - Natural language vault queries
  - Discovery card delivery system
  - Group consensus polling

**Bot Commands:**
```
/start                  → Onboarding sequence
/whoami                 → View food persona
/discover [area]        → Scout new restaurants
/consensus              → Group decision lobby
/export_vault           → Download sovereign data
/wipe_memory            → Nuclear vault wipe
/privacy_mode           → Toggle data sharing
```

---

## 🧠 PART 2: MULTI-AGENT ORCHESTRATION

### B. The Three Core Agents

#### **Agent 1: Social Hunter** (`server/skills/social_hunter.js`)
**Purpose:** Extract restaurant metadata from raw user input

**Capabilities:**
- 🔍 **Text Parsing:** Extracts restaurant name, cuisine, area, budget from Telegram messages
- 📹 **Multimodal Ingestion:** 
  - Detects Instagram/TikTok links
  - Spawns Python engine (`ingestion.py`) to scrape food videos
  - Extracts cuisine tags, vibe, and location from video metadata
- 🤖 **AI Extraction:** Uses Groq Llama 3 for intelligent data structuring
- ⚡ **Fallback Mode:** If GROQ_API_KEY missing → returns demo data (Rameshwaram Cafe)
- 🎯 **Intent Detection:** Identifies "high intent" signals (enthusiastic language)

**Workflow:**
```
User Input (text/image/link)
    ↓
Detect Media Type
    ├→ Instagram/TikTok? → Python Ingestion Engine
    ├→ Text? → Groq LLM extraction
    └→ Missing Keys? → Simulation Mode
    ↓
Structured JSON
    { name, cuisine, area, budget, vibe, meal_type, intent_score }
    ↓
Save to Sovereign Vault
```

---

#### **Agent 2: Taste Alchemist** (`server/skills/taste_alchemist.js`)
**Purpose:** Generate personalized recommendations based on history + context

**Capabilities:**
- 📊 **Craving Cycle Analysis:**
  - Tracks "last_satisfied" timestamp for each cuisine
  - Calculates "avg_cycle_days" (how often user craves this)
  - Prioritizes overdue cravings (e.g., "Biryani craving overdue by 6 days")
  
- 🎯 **Contextual Filtering:**
  - Budget constraints
  - Location preferences
  - Time-of-day context
  - Weather conditions
  
- 🔍 **Cold-Start Fallback:** 
  - If vault is empty → Triggers **Tavily Web Search API**
  - Searches live web for recommendations
  - If TAVILY_API_KEY missing → Returns safe demo recommendations

**Recommendation Logic:**
```
Filter candidates by:
  1. Unvisited spots only
  2. Budget ≤ user_budget
  3. Location match
  4. Craving cycle status
    ↓
  Score by cuisine frequency + vibe matching
    ↓
  Return top 3 recommendations with reasoning
```

---

#### **Agent 3: Discovery Agent** (`server/skills/discovery_agent.js`)
**Purpose:** Scout NEW restaurants matching taste profile

**Capabilities:**
- 🧬 **Taste Vector Builder:**
  - Analyzes cuisine frequency (visited spots weighted 2x higher)
  - Extracts vibe patterns (cozy, lively, rooftop, etc.)
  - Calculates average budget
  - Identifies hard vetoes + dietary needs
  
- 🗺️ **Geocoding (Bangalore-biased):**
  - Nominatim API for location disambiguation
  - Prevents wrong-city suggestions
  
- 🎲 **Multi-Stage Enrichment:**
  - Fetches up to 50 raw candidate restaurants
  - Enriches in batches of 25 using Groq LLM
  - Ranks by taste profile match + diversity
  - Includes "wildcard" suggestion (outlier pick) for serendipity
  
- 📋 **Guaranteed Results:**
  - Empty vault? → Uses name-diversity scoring
  - No matches after filtering? → Falls back to top-N candidates

**Discovery Pipeline:**
```
User: "/discover Koramangala"
    ↓
Build Taste Vector from existing vault
    ↓
Fetch restaurants from Nominatim (Bangalore)
    ↓
Enrich metadata (cuisine, ratings, vibes)
    ↓
Score by:
  • Cuisine alignment
  • Vibe diversity
  • Budget fit
  • Discovery potential (novelty)
    ↓
Return Top Results + Wildcard
```

---

### C. Supporting Agents

#### **Agent 4: Lifestyle Operator** (`server/skills/lifestyle_operator.js`)
**Purpose:** Monitor environmental context and trigger proactive recommendations

**Capabilities:**
- ☁️ **Weather Monitoring:**
  - Fetches OpenWeather API every 30 min
  - Rain/Cold → Prioritizes warm, cozy spots (soup, ramen, cafes)
  
- ⏰ **Time-of-Day Logic:**
  - Friday nights → Suggests lively, breweries, date-spot restaurants
  - Lunch hours (11-14) → Quick, budget-friendly options
  - Other times → Any suitable spot
  
- 🎯 **Variety Enforcement:**
  - Analyzes last 3 visited spots
  - If all same cuisine → Penalizes that cuisine for next 5 days
  - Ensures food diversity

---

#### **Agent 5: Group Consensus** (`server/skills/group_consensus.js`)
**Purpose:** Resolve group conflicts and find optimal restaurant for multiple users

**Capabilities:**
- 🧮 **Mathematical Core:** 
  - Python backend (`social_brain.py`) 
  - Implements weighted voting algorithm
  - Balances individual preferences with group harmony
  
- 👥 **Peer Vector Analysis:**
  - Identifies "experts" in specific cuisines
  - Applies consensus weights
  - Handles vetoes and negative preferences
  
- 🎯 **Mood Profiles:**
  - Applies mood-based constraints (adventurous, safe, budget-conscious, etc.)
  - Weights recommendations accordingly

**Consensus Algorithm:**
```
Input: { host_restaurants, peer_vectors, mood, constraints }
    ↓
Build group cuisine frequency vector
    ↓
Identify cuisine experts among peers
    ↓
Apply mood profile overrides
    ↓
Filter by constraints (budget, location, cuisine)
    ↓
Score: (personal_preference + group_consensus_weight) × (expertise_factor)
    ↓
Return best_option + reasoning
```

---

#### **Agent 6: Agency Daemon** (`server/skills/agency_daemon.js`)
**Purpose:** Proactive behavioral triggers (runs hourly via cron)

**Triggers:**
- 🎊 **Friday Night Nudge:** "It's Friday! Time for adventure?"
- 🌧️ **Weather Alert:** "Rainy day coming — cozy spots recommended"
- 🍽️ **Craving Overdue:** "You haven't had biryani in 10 days!"
- 🚨 **Routine Alert:** "You've been eating only Italian lately — explore something new!"

---

#### **Supporting Skills:**

**7. Onboarding** (`server/skills/onboarding.js`)
- 4-step interactive setup via Telegram buttons
- Captures: Diet type, favorite cuisines, spice tolerance, eating style
- Creates user profile in per-user vaults

**8. Mood Profiles** (`server/skills/mood_profiles.js`)
- Maps 5 mood profiles: Adventurous, Safe, Budget-Conscious, Quick, Date-Night
- Applies mood-specific constraint overrides to discovery/consensus

**9. Reweight Engine** (`server/skills/reweight_engine.js`)
- Records veto feedback (too expensive, too far, not in mood, dislike cuisine)
- Updates taste vector weights for future recommendations
- Implements penalty decay over time

**10. Weather Service** (`server/skills/weather_service.js`)
- Fetches OpenWeather API
- Returns current temperature, condition, wind speed
- Used by Lifestyle Operator for context

**11. Vault Router** (`server/skills/vault_router.js`)
- Per-user file-based vaults (JSON)
- Keeps food memory local and sovereign
- Functions: `readUserVault()`, `writeUserVault()`, `listAllUsers()`

**12. Vault Search** (`server/skills/vault_search.js`)
- Natural language querying
- Parses user queries: "South Indian under 300 rupees"
- Returns matching restaurants from vault

---

## 🐍 PART 3: PYTHON MATHEMATICAL ENGINES

### D. Python Services

#### **1. Social Brain** (`server/python_services/social_brain.py`)
**Purpose:** Group consensus mathematical core

**Workflow:**
1. Receives JSON payload via stdin
2. Implements weighted consensus algorithm
3. Returns best restaurant match + reasoning via stdout

**Algorithm:**
```
For each restaurant candidate:
  score = (personal_fit × personal_weight)
        + (group_consensus × consensus_weight)  
        + (expert_boost × expertise_factor)
        
Best Option = arg_max(score)
```

---

#### **2. Ingestion Engine** (`server/python_services/ingestion.py`)
**Purpose:** Extract restaurant data from Instagram/TikTok videos

**Capabilities:**
- 📥 Uses `yt-dlp` to download video metadata
- 🎬 Extracts captions, description, hashtags
- 🏷️ AI-powered tag extraction (cuisine, vibes, location)
- 📊 Returns structured JSON to Node backend

---

#### **3. Visit Verifier** (`server/python_services/visit_verifier.py`)
**Purpose:** Vision-based restaurant identification from photos

**Workflow:**
1. Receives photo path
2. Sends to Google Gemini Vision API
3. Analyzes signage, menu, food
4. Returns identified restaurant + confidence score

---

## 🎨 PART 4: FRONTEND (Canvas)

### E. React Dashboard (`canvas/src/`)

#### **1. Overview Tab** (`components/Overview.jsx`)
**Purpose:** Real-time intelligence dashboard

**Components:**
- 📊 **Analytics Cards:**
  - Total restaurants saved
  - Visited vs. bucket list count
  - Average budget
  - Location heatmap
  
- 🍽️ **Craving Cycles:**
  - Displays craving status for each cuisine type
  - Progress bars showing "days until overdue"
  - Color-coded by cuisine (biryani: orange, pizza: red, etc.)
  
- 🤖 **Agent Operations Feed:**
  - Real-time thought stream from all agents
  - Shows actions: EXTRACTION, CYCLE_CHECK, WEATHER_CHECK, SYNC
  - Live WebSocket updates
  
- 🎮 **Interactive Controls:**
  - "Test Group Consensus" button
  - "Trigger Heartbeat Daemon" button
  - Results displayed in modal

---

#### **2. Agents Tab** (`components/AgentGrid.jsx`)
**Purpose:** View onboarded users and their profiles

**Features:**
- 👤 **Agent Cards:**
  - User name + Telegram username
  - Food persona (generated by Groq)
  - Diet type, favorite cuisines, spice level
  - Restaurant count + visit history
  
- 🔗 **Social Graph:**
  - Shows which users can participate in group consensus
  - Displays shared cuisine interests

---

#### **3. Food Vault Tab** (`components/FoodVault.jsx`)
**Purpose:** Browse and manage saved restaurants

**Features:**
- 📋 **Restaurant Cards:**
  - Name, cuisine, area, budget, vibe
  - Visited status
  - Saved date
  
- 🔍 **Filters:**
  - By cuisine type
  - By area/location
  - By budget range
  - By visited/unvisited
  
- 🏷️ **Tags:**
  - Cuisine tags
  - Vibe tags
  - Discovery tag (if found via Discovery Agent)

---

#### **4. Social Graph Tab** (`components/SocialGraph.jsx`)
**Purpose:** Visualize trust networks and preference alignment

**Features:**
- 🕸️ **Network Visualization:**
  - Shows user nodes and their connections
  - Edge thickness = cuisine overlap
  - Color = primary cuisine preference

---

#### **Technologies:**
- React 19.2
- Vite (dev server on port 5173)
- Framer Motion (animations)
- Lucide React (icons)
- Tailwind CSS (styling)
- Socket.io (real-time updates)

---

## 📱 PART 5: TELEGRAM BOT FLOWS

### F. User Journey

#### **1. Onboarding Flow**
```
User: /start
  ↓ (if not onboarded)
Bot: "Step 1: What do you eat?" [Veg|Non-Veg|Vegan|Egg]
User: Selects "Non-Veg"
  ↓
Bot: "Step 2: Favorite cuisines?" [Multi-select + Done button]
User: Selects Indian, Italian, Thai → Done
  ↓
Bot: "Step 3: Spice level?" [Mild|Medium|Extreme]
User: Selects "Medium"
  ↓
Bot: "Step 4: Eating style?" [Explorer|Loyalist]
User: Selects "Explorer"
  ↓
Bot: "✅ Profile complete! You're The Bangalore Food Explorer"
  ↓
User Vault Created with profile metadata
```

---

#### **2. Discovery Flow**
```
User: "/discover Koramangala"
  ↓
Bot: "🔭 Scouting Koramangala... Applying your Sovereign Filter..."
  ↓
Backend:
  1. Calls Discovery Agent
  2. Builds taste vector from existing vault
  3. Fetches restaurants from Nominatim API
  4. Ranks by profile match
  5. Returns top 5 + wildcard
  ↓
Bot Sends Cards:
  "🏆 #1: Chinita (Mexican/Tacos)"
  "🎲 Wildcard: Local Thai Place"
  ↓
User: Clicks "💾 Save to Vault"
  ↓
Bot: "✅ Chinita saved! Discovered: true"
```

---

#### **3. Photo Verification Flow**
```
User: Uploads photo of food/restaurant
  ↓
Bot: "📸 Analysing your photo..."
  ↓
Backend:
  1. Downloads image from Telegram
  2. Sends to Google Gemini Vision API
  3. Identifies restaurant from signage/food/menu
  ↓
Bot: "✅ Visit Verified!"
  "📍 Chinita has been marked as visited"
  "🔄 Craving cycle for Mexican reset"
```

---

#### **4. Group Consensus Flow**
```
User: "/consensus"
  ↓
Bot: "🤝 Starting Group Consensus Lobby"
  "Invite friends to vote!"
  [Join Lobby Button]
  ↓
Friends join via bot command
  ↓
Host: "Let's finalize!"
  ↓
Bot Calls Backend:
  1. Collects all peer taste vectors
  2. Runs Social Brain algorithm
  3. Returns consensus pick
  ↓
Bot: "🏆 Best Match: Fusion Biryani (Indiranagar)"
  "Satisfies: Explorer + Budget-conscious + Italian lover"
  [Directions] [Accept] [Veto]
  ↓
User Vetoes:
  Bot: "Why? [Too Expensive|Too Far|Not in Mood|Dislike Cuisine]"
  ↓
User: "Too Far"
  ↓
Bot: "📍 Proximity flagged. Recalculating..."
  [Recalculate Now Button]
```

---

#### **5. Natural Language Vault Search**
```
User: "South Indian under 300 rupees"
  ↓
Bot: "🔍 Querying Sovereign Vault..."
  ↓
Backend: Parses query → filters by:
  - Cuisine: ["South Indian", "Dosa", "Idli"]
  - Budget: ≤ 300
  ↓
Bot Returns: "Found 3 spots!"
  1. Rameshwaram Cafe (Brookfield) - ₹180
  2. MTR (Indiranagar) - ₹250
  3. Sai Snacks (Local) - ₹120
```

---

## 🔌 PART 6: EXTERNAL API INTEGRATIONS

### G. Third-Party Services

| API | Purpose | .env Key | Fallback |
|-----|---------|----------|----------|
| **Groq** | LLM extraction + persona generation | `GROQ_API_KEY` | Demo data |
| **Telegram** | Bot communication | `TELEGRAM_BOT_TOKEN` | N/A (required) |
| **OpenWeather** | Weather context | `OPENWEATHER_API_KEY` | Default clear weather |
| **Tavily** | Web search (cold-start) | `TAVILY_API_KEY` | Demo recommendations |
| **RapidAPI** | Instagram scraping | `RAPIDAPI_KEY` | Simulation mode |
| **Google Gemini** | Photo vision analysis | `GEMINI_API_KEY` | Graceful fallback |
| **Nominatim** | Geocoding (free, no key) | - | Built-in |

---

## 💾 PART 7: DATA PERSISTENCE

### H. Sovereign Vault Architecture

**Per-User Vault File:** `server/memory/{user_id}_vault.json`

**Vault Structure:**
```json
{
  "user_profile": {
    "name": "John",
    "telegram_id": 12345,
    "telegram_username": "john_foodie",
    "diet_type": "Non-Veg",
    "favorite_cuisines": ["Indian", "Italian"],
    "spice_tolerance": "Medium",
    "eating_style": "Explorer",
    "persona_name": "The Bangalore Food Explorer",
    "onboarding_complete": true
  },
  "restaurants": [
    {
      "id": "1",
      "name": "Chinita",
      "cuisine": "Mexican",
      "area": "Koramangala",
      "budget": 400,
      "vibe": "Casual, Friendly",
      "saved_at": "2026-05-08",
      "visited": false,
      "rating": null,
      "high_intent": false
    }
  ],
  "craving_patterns": {
    "mexican": {
      "last_satisfied": "2026-04-30",
      "avg_cycle_days": 7,
      "cooldown_days": 5
    }
  },
  "analytics": {
    "telegram_chat_id": 12345,
    "privacy_mode": false,
    "total_saves": 42,
    "total_visits": 15,
    "favorite_area": "Koramangala",
    "average_budget": 350
  }
}
```

---

## 🎯 PART 8: KEY FEATURES SUMMARY

### I. Features Implemented ✅

#### **Discovery & Recommendation**
- ✅ Restaurant discovery by area
- ✅ Taste profile-based ranking
- ✅ Craving cycle tracking
- ✅ Cold-start web search (Tavily)
- ✅ Wildcard serendipity picks
- ✅ GPS-based discovery

#### **Social & Group**
- ✅ Multi-user onboarding
- ✅ Group consensus voting
- ✅ Peer taste vector analysis
- ✅ Veto feedback system
- ✅ Expert identification
- ✅ Mood-based constraints

#### **Behavioral**
- ✅ Craving cycle detection
- ✅ Cuisine rotation enforcement
- ✅ Weather-triggered recommendations
- ✅ Time-of-day logic
- ✅ Negative preference learning
- ✅ Implicit intent detection

#### **Media**
- ✅ Photo-based visit verification (Gemini Vision)
- ✅ Social media video ingestion (Instagram/TikTok)
- ✅ Metadata extraction from videos
- ✅ Multi-format restaurant input

#### **Privacy & Sovereignty**
- ✅ Per-user local vaults (JSON files)
- ✅ Telegram-first communication
- ✅ Data export functionality
- ✅ Privacy mode toggle
- ✅ Nuclear wipe command
- ✅ No centralized cloud storage

#### **Dashboard**
- ✅ Real-time agent operations feed
- ✅ Analytics dashboard
- ✅ Craving cycle visualization
- ✅ Restaurant browser
- ✅ Social graph visualization
- ✅ WebSocket live updates

---

## 🚀 PART 9: HOW TO RUN

### J. Startup Commands

**Terminal 1: Backend API & Bot**
```bash
cd server
node index.js    # API on port 5001
```

**Terminal 2: Telegram Bot**
```bash
cd server
node bot.js      # Listens for Telegram messages
```

**Terminal 3: Frontend**
```bash
cd canvas
npm run dev      # Vite dev server on port 5173
```

**Access:**
- 🎨 Dashboard: `http://localhost:5173`
- 💻 API: `http://localhost:5001`
- 🤖 Telegram: Find bot by token in Telegram app

---

## 📊 PART 10: DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                        TELEGRAM USER                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
                    ┌────────────────────┐
                    │  Telegram Bot      │ (bot.js)
                    │  (Telegraf)        │
                    └────────┬───────────┘
                             │
                             ↓
                    ┌────────────────────────────────────────┐
                    │   Express API Server (index.js)        │
                    │   - Orchestrates all agents            │
                    │   - Manages memory persistence         │
                    │   - Emits WebSocket thoughts           │
                    └────────┬───────────────────────────────┘
                             │
           ┌─────────────────┼─────────────────┐
           ↓                 ↓                 ↓
    ┌────────────────┐ ┌───────────────┐ ┌─────────────────┐
    │ Social Hunter  │ │Taste Alchemist│ │ Discovery Agent │
    │ (Extraction)   │ │(Recommend)    │ │ (Scout)         │
    └────────────────┘ └───────────────┘ └─────────────────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             ↓
                    ┌────────────────────┐
                    │ Sovereign Vault    │
                    │ (Per-user JSON)    │
                    └────────────────────┘
                             │
                             ↓
                    ┌────────────────────┐
                    │  Frontend React    │ (Canvas)
                    │  (Dashboard)       │
                    └────────────────────┘
```

---

## 🔐 PART 11: SAFETY NET (Simulation Mode)

### K. Graceful Degradation

If any API key is missing, the system **seamlessly falls back** to simulation data:

**Missing GROQ_API_KEY:**
- Social Hunter → Returns mock: "Rameshwaram Cafe"

**Missing TAVILY_API_KEY:**
- Taste Alchemist (cold-start) → Returns safe demo recommendations

**Missing RAPIDAPI_KEY:**
- Ingestion Engine → Skips video scraping

**Missing GEMINI_API_KEY:**
- Visit Verifier → Offers manual confirmation option

**Motto:** "Flawless demo guaranteed, even if stage Wi-Fi drops!"

---

## 🎓 PART 12: TECH STACK SUMMARY

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 + Vite | Real-time dashboard |
| **Backend** | Express.js + Node 22 | API orchestration |
| **Bot** | Telegraf | Telegram messaging |
| **AI** | Groq Llama 3 | Language extraction |
| **Math** | Python 3 (Numpy/Scipy) | Group consensus |
| **Vision** | Google Gemini | Photo analysis |
| **Search** | Tavily | Web fallback search |
| **Geo** | Nominatim API | Location mapping |
| **Weather** | OpenWeather API | Context awareness |
| **Database** | JSON Files | Sovereign storage |
| **Real-time** | Socket.io | Live thought streams |
| **Styling** | Tailwind CSS | UI design |

---

## 📝 Conclusion

CraveMap is a **complete, working autonomous food intelligence system** built for production hackathon demos. It successfully implements:

✅ Multi-agent orchestration  
✅ Behavioral learning & personalization  
✅ Group decision-making algorithms  
✅ Real-time Telegram interface  
✅ Media ingestion & analysis  
✅ Sovereign data ownership  
✅ Graceful degradation & simulation mode  

**The system is ready for real users!** 🚀
