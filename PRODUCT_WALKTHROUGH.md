# CraveMap — Product Walkthrough

A step-by-step guide showing how a user interacts with CraveMap from first contact to daily use.

---

## Prerequisites

Before starting, ensure these three services are running:

```bash
# Terminal 1: API Server (The Brain)
cd server && node index.js          # Runs on port 5001

# Terminal 2: Telegram Bot (The Mouth)
cd server && node bot.js            # Connects to Telegram

# Terminal 3: React Dashboard (The Eyes)
cd canvas && npm run dev            # Runs on port 5173
```

---

## Flow 1 — First-Time Onboarding

**Where:** Telegram Bot

1. Open Telegram and find the CraveMap bot.
2. Send `/start`.
3. The bot greets you and begins a 4-step onboarding:

   **Step 1 — Diet Type**
   > Bot: "What do you eat?"
   > Options: `[Veg]` `[Non-Veg]` `[Vegan]` `[Egg]`
   > → Tap your choice.

   **Step 2 — Favorite Cuisines**
   > Bot: "Pick your favorite cuisines!"
   > Options: `[Indian]` `[Italian]` `[Chinese]` `[Thai]` `[Mexican]` ... `[Done ✅]`
   > → Tap multiple cuisines, then tap Done.

   **Step 3 — Spice Tolerance**
   > Bot: "How spicy do you like it?"
   > Options: `[Mild]` `[Medium]` `[Extreme]`
   > → Tap your level.

   **Step 4 — Eating Style**
   > Bot: "Are you an Explorer or a Loyalist?"
   > Options: `[Explorer]` `[Loyalist]`
   > → Tap your style.

4. Bot responds: "✅ Profile complete! You're **The Bangalore Food Explorer**"
5. Your personal sovereign vault is created at `server/memory/{your_telegram_id}_vault.json`.

**What happened behind the scenes:**
- Groq Llama 3 generated your food persona name.
- A per-user JSON vault was created with your profile metadata.
- The dashboard now shows you as an onboarded agent.

---

## Flow 2 — Saving a Restaurant (Social Hunter)

**Where:** Telegram Bot → Dashboard

1. Send a message to the bot with a restaurant recommendation:
   ```
   Check out Rameshwaram Cafe in Brookfield, amazing dosas for around 200 rupees!
   ```

2. The **Social Hunter** agent activates. Within 2-3 seconds:
   - Groq Llama 3 extracts: name, cuisine, area, budget, vibe
   - Data is saved to your sovereign vault
   - Bot replies with a confirmation card showing extracted details

3. **Watch the Dashboard** (`http://localhost:5173`):
   - The "OpenClaw Operations" feed shows live agent thoughts:
     ```
     [EXTRACTION] Processing user input...
     [EXTRACTION] Identified: Rameshwaram Cafe | South Indian | Brookfield | ₹200
     [CYCLE_CHECK] Updating South Indian craving cycle...
     [SYNC] Vault updated successfully.
     ```
   - Analytics cards update: restaurant count increases, new area appears.

**Alternative inputs that work:**
- Paste an Instagram reel link → Python ingestion engine extracts metadata
- Paste a TikTok link → same pipeline
- Just type naturally: "That new Thai place in Indiranagar was fire"

---

## Flow 3 — Discovering New Restaurants

**Where:** Telegram Bot

1. Send: `/discover Koramangala`

2. Bot responds: "🔭 Scouting Koramangala... Applying your Sovereign Filter..."

3. Behind the scenes:
   - Discovery Agent builds a **taste vector** from your vault (cuisine frequency, budget average, vibe patterns)
   - Fetches restaurants near Koramangala from **Nominatim API** (Bangalore-biased geocoding)
   - Enriches results using **Groq Llama 3** (adds cuisine tags, ratings, vibes)
   - Ranks by taste profile match + diversity score
   - Includes a **wildcard pick** for serendipity

4. Bot sends discovery cards:
   ```
   🏆 #1: Chinita (Mexican/Tacos) — ₹400 — Lively vibe
   🥈 #2: Bowl Company (Asian Bowls) — ₹350 — Cozy
   🥉 #3: Truffles (Burgers) — ₹250 — Casual
   🎲 Wildcard: Hidden Thai Kitchen — ₹500 — Rooftop
   ```
   Each card has a `[💾 Save to Vault]` button.

5. Tap "Save to Vault" on any card → Bot confirms: "✅ Chinita saved! Discovered: true"

---

## Flow 4 — Getting Recommendations (Taste Alchemist)

**Where:** Telegram Bot

1. Ask the bot for a recommendation:
   ```
   What should I eat tonight? Budget is 400, somewhere in Indiranagar.
   ```

2. The **Taste Alchemist** agent kicks in:
   - Filters your vault: unvisited spots only, budget ≤ 400, area = Indiranagar
   - Checks craving cycles: which cuisines are overdue?
   - Scores by cuisine frequency + vibe matching
   - Returns top 3 personalized recommendations with reasoning

3. Bot responds:
   ```
   🍽️ Based on your craving cycles and preferences:

   1. Fusion Biryani (Indian) — ₹350 — Craving overdue by 4 days!
   2. Pasta Street (Italian) — ₹400 — Matches your Friday evening vibe
   3. Chinita (Mexican) — ₹400 — Discovered but unvisited

   Your South Indian craving is satisfied (visited 2 days ago).
   ```

**Cold-Start Scenario (empty vault):**
- If you have no saved restaurants, the Taste Alchemist calls the **Tavily Search API** to find live web recommendations for your area and preferences.
- If Tavily API key is missing, it returns safe demo recommendations.

---

## Flow 5 — Photo Visit Verification (Gemini Vision)

**Where:** Telegram Bot

1. Visit a restaurant and take a photo (of the signage, food, or menu).
2. Upload the photo to the CraveMap bot.

3. Bot responds: "📸 Analysing your photo..."

4. Behind the scenes:
   - Photo is downloaded from Telegram servers
   - Sent to **Google Gemini Vision API**
   - AI analyzes signage, menu text, food appearance
   - Identifies the restaurant name and matches against your vault

5. Bot responds:
   ```
   ✅ Visit Verified!
   📍 Chinita has been marked as visited.
   🔄 Craving cycle for Mexican has been reset.
   ⭐ Rate your experience? [1] [2] [3] [4] [5]
   ```

6. Your vault updates: `visited: true`, craving cycle timestamp resets.

---

## Flow 6 — Group Consensus (The Killer Feature)

**Where:** Telegram Bot (Group or Individual)

### Setting Up the Lobby

1. Host sends: `/consensus`
2. Bot responds:
   ```
   🤝 Starting Group Consensus Lobby!
   Invite your friends to join.
   [Join Lobby]
   ```
3. Friends tap "Join Lobby" in their Telegram chats.
4. Bot shows lobby status: "3/4 members joined..."

### Running Consensus

5. Host taps: `[Lock It In 🔒]`
6. Behind the scenes:
   - Backend collects all participants' taste vectors from their vaults
   - Sends data to **Python Social Brain** (`social_brain.py`)
   - Algorithm calculates:
     - Personal preference fit for each restaurant candidate
     - Group consensus weight (how well it satisfies everyone)
     - Expertise factor (who's the "expert" in each cuisine?)
     - Mood adjustments (adventurous vs. safe vs. budget-conscious)
   - Returns the mathematically optimal pick

7. Bot responds:
   ```
   🏆 Best Match: Fusion Biryani (Indiranagar)
   💰 Avg Budget: ₹380
   🎯 Group Harmony: 92%

   Satisfies:
   • Preetam (Explorer) — high cuisine match
   • Anurag (Budget-conscious) — within budget
   • Sarah (Vegan) — vegan options available

   [✅ Accept] [❌ Veto] [📍 Directions]
   ```

### Handling Vetoes

8. Any member taps `[❌ Veto]`
9. Bot asks: "Why?"
   > Options: `[Too Expensive]` `[Too Far]` `[Not in Mood]` `[Dislike Cuisine]`
10. Member taps a reason → Bot: "📍 Proximity flagged. Recalculating..."
11. System re-weights preferences and runs the algorithm again.
12. New result appears with updated harmony score.

---

## Flow 7 — Natural Language Vault Search

**Where:** Telegram Bot

1. Type any natural language food query:
   ```
   South Indian under 300 rupees
   ```

2. Bot parses the query:
   - Cuisine filter: ["South Indian", "Dosa", "Idli"]
   - Budget filter: ≤ 300

3. Bot searches your sovereign vault and responds:
   ```
   🔍 Found 3 spots in your vault!

   1. Rameshwaram Cafe (Brookfield) — ₹180
   2. MTR (Indiranagar) — ₹250
   3. Sai Snacks (Local) — ₹120
   ```

**Other queries that work:**
- "Italian places I haven't visited"
- "Something cozy under 500"
- "What did I save last week?"

---

## Flow 8 — Proactive Intelligence (No User Action Needed)

**Where:** Happens automatically → appears in Telegram and Dashboard

### Weather-Based Nudge
- OpenWeather API detects rain at 6 PM.
- **Lifestyle Operator** automatically sends:
  ```
  🌧️ Rainy evening alert!
  Based on your craving cycles, here are cozy spots:
  1. Ramen House (Japanese) — Warm & Cozy
  2. Chai Point (Indian) — Comfort food
  ```

### Craving Overdue Alert
- System detects your biryani cycle is 10 days (average is 7).
- **Agency Daemon** sends:
  ```
  🍽️ Craving Alert!
  You haven't had Biryani in 10 days (your average cycle is 7 days).
  Want a suggestion? [Yes 🍛] [Not now]
  ```

### Variety Enforcement
- System detects you've had pizza 3 times in the last 4 meals.
- Dashboard shows a warning flag.
- Next recommendations automatically penalize pizza and boost other cuisines.

### Friday Night Nudge
- It's Friday at 6 PM.
- **Agency Daemon** sends:
  ```
  🎊 It's Friday night!
  Time for an adventure? Here are lively spots:
  1. Toit Brewpub — ₹800 — Lively, Brewery
  2. Social — ₹600 — Rooftop, Cocktails
  ```

---

## Flow 9 — Privacy & Data Control

**Where:** Telegram Bot

### View Your Persona
```
/whoami
```
> Bot shows your full food persona: diet, cuisines, spice level, eating style, persona name, total saves, total visits.

### Export Your Data
```
/export_vault
```
> Bot sends your complete vault as a downloadable JSON file.

### Toggle Privacy
```
/privacy_mode
```
> Toggles whether your data is visible to group consensus participants.

### Nuclear Wipe
```
/wipe_memory
```
> Permanently deletes your entire vault. All food memory erased. Fresh start.

---

## Flow 10 — Dashboard Monitoring

**Where:** Browser — `http://localhost:5173`

### What You See:

**Analytics Cards (Top Row)**
- Total restaurants saved
- Visited vs. unvisited count
- Average budget across all saves
- Most frequent area

**Craving Cycles (Middle Section)**
- Visual progress bars for each cuisine
- Green = recently satisfied
- Yellow = approaching cycle
- Red = overdue craving
- Shows "days until overdue" for each

**Agent Operations Feed (Live)**
- Real-time thought stream from all agents
- Each entry shows: timestamp, agent name, action type, details
- Updates via WebSocket — no page refresh needed
- Action types: `EXTRACTION`, `CYCLE_CHECK`, `WEATHER_CHECK`, `DISCOVERY`, `CONSENSUS`, `SYNC`

**Interactive Controls**
- `[Test Group Consensus]` — runs consensus with current vault data
- `[Trigger Heartbeat Daemon]` — manually fires the proactive agent cycle
- Results appear in a modal overlay

---

## Summary — The Complete User Journey

```
First Visit:
  /start → Onboarding → Profile Created → Vault Initialized

Daily Use:
  Paste links / Type recommendations → Social Hunter extracts → Vault grows
  Ask for suggestions → Taste Alchemist recommends → Craving cycles update
  Upload photos → Gemini Vision verifies → Visit recorded

Social:
  /consensus → Friends join → Lock It In → Math resolves conflicts → Eat together

Passive:
  Weather changes → Proactive nudge arrives
  Craving overdue → Alert sent automatically
  Variety drops → System self-corrects

Control:
  /export_vault → Download your data
  /privacy_mode → Control visibility
  /wipe_memory → Delete everything
```

---

*CraveMap — Don't just save it. Crave it. Lock it in.* 🚀
