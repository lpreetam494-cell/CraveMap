# CraveMap — Project Explanation

## What is CraveMap?

CraveMap is a **Sovereign Food Intelligence Agent** — an autonomous multi-agent system that turns your scattered food signals (saved reels, chat recommendations, food photos) into a proactive, personalized food decision engine. Unlike Zomato or Google Maps which are passive search tools, CraveMap **watches, learns, and acts** on your behalf.

Built for the **OpenClaw Hackathon (SRI-B)**.

---

## The Problem We're Solving

Every day, millions of people waste 20–30 minutes deciding what to eat. The irony? The answer is already hidden in their own digital footprint — saved Instagram reels, WhatsApp recommendations from friends, past restaurant visits. But this data is scattered across 5+ apps with zero intelligence connecting it.

We call this **Digital Food Hoarding**: ~50% of saved restaurants are never visited because they're buried in noise.

**Existing tools fail because:**
- Zomato/Yelp are search engines with no memory — every session starts from scratch.
- Instagram saved posts are an unstructured dump.
- No tool handles group dining conflicts (vegan + spicy + budget constraints).
- No tool learns your behavioral patterns over time.

---

## How CraveMap Works — The Multi-Agent Architecture

CraveMap is powered by **three core AI agents** orchestrated through OpenClaw, with additional supporting agents for specialized tasks.

### Agent 1: Social Hunter
**Role:** Extract structured restaurant data from raw user input.

The Social Hunter listens to your Telegram messages. When you paste an Instagram reel link, type a restaurant recommendation, or share a food photo, this agent uses **Groq Llama 3 (70B)** to extract:
- Restaurant name
- Cuisine type
- Area/location
- Budget estimate
- Vibe (cozy, lively, rooftop, etc.)
- Intent score (how excited you sound about it)

For social media links, it spawns a **Python ingestion engine** that uses `yt-dlp` to extract video metadata, captions, and hashtags — converting a 30-second reel into structured data.

**Fallback:** If API keys are missing, it seamlessly returns simulation data so the demo never breaks.

### Agent 2: Taste Alchemist
**Role:** Generate personalized recommendations based on your history + context.

This agent analyzes your sovereign vault to understand:
- **Craving Cycles** — when you last ate each cuisine and how often you crave it. If your average biryani cycle is 7 days and it's been 10, the system flags it as "overdue."
- **Contextual Filters** — budget constraints, location preferences, time of day, weather conditions.
- **Visit History** — prioritizes unvisited spots over places you've already been.

**Cold-Start Solution:** For new users with empty vaults, the Taste Alchemist calls the **Tavily Search API** to pull live web recommendations, ensuring useful results from day one.

### Agent 3: Lifestyle Operator
**Role:** Monitor environmental context and trigger proactive suggestions — without being asked.

This agent runs continuously in the background:
- **Weather Monitoring** — fetches OpenWeather API every 30 minutes. Rain detected? It pushes a "Cozy Ramen Night" suggestion automatically.
- **Time-of-Day Logic** — Friday nights get brewery/date-spot suggestions. Lunch hours get quick, budget-friendly options.
- **Variety Enforcement** — if you've eaten the same cuisine 3 times in a row, it penalizes that cuisine for the next 5 days and nudges you toward diversity.

### Agent 4: Group Consensus Engine
**Role:** Mathematically resolve dining conflicts for groups.

When a group of friends can't agree on where to eat, the Consensus Engine:
1. Collects all participants' taste vectors (favorite cuisines, budget ranges, dietary restrictions).
2. Runs a **Python-powered weighted voting algorithm** (Social Brain) that factors in:
   - Personal preference scores
   - Group consensus weights
   - Cuisine expertise (who's the "expert" in Italian food?)
   - Mood profiles (adventurous, safe, budget-conscious, date-night)
3. Returns the mathematically optimal restaurant with a "group harmony" percentage.
4. Supports **vetoes** — if someone disagrees, they give a reason, and the system re-weights and recalculates.

### Agent 5: Agency Daemon
**Role:** Proactive behavioral triggers running on a schedule.

Sends automatic nudges:
- 🎊 "It's Friday! Time for adventure?"
- 🌧️ "Rainy day coming — cozy spots recommended."
- 🍽️ "You haven't had biryani in 10 days!"
- 🚨 "You've been eating only Italian lately — explore something new!"

---

## The Sovereign Data Vault

CraveMap's core philosophy is **data sovereignty**. Your food memory belongs to you — not to a cloud database, not to advertisers, not to a corporation.

**How it works:**
- Each user gets a personal vault file: `server/memory/{user_id}_vault.json`
- Contains: user profile, saved restaurants, craving patterns, analytics
- Stored locally — never uploaded to any cloud
- Users can export their data (`/export_vault`), toggle privacy (`/privacy_mode`), or completely wipe everything (`/wipe_memory`)

This creates a **natural moat**: the longer a user builds their food brain, the more valuable and irreplaceable it becomes — and competitors can't access or replicate it.

---

## The User Interface

### Telegram Bot (Primary Interface)
The bot is the main way users interact with CraveMap. It supports:
- `/start` — 4-step interactive onboarding
- `/discover [area]` — scout restaurants matching your taste profile
- `/consensus` — start a group dining decision lobby
- `/whoami` — view your food persona
- Natural language vault queries ("South Indian under 300 rupees")
- Photo upload for visit verification
- Inline keyboards for all interactions

### React Dashboard (Secondary Interface)
A real-time intelligence dashboard showing:
- **Analytics Cards** — total restaurants, visited vs. bucket list, average budget
- **Craving Cycles** — visual progress bars for each cuisine (overdue = red)
- **Agent Operations Feed** — live thought stream from all agents via WebSocket
- **Interactive Controls** — trigger consensus, heartbeat daemon, and view results
- **Restaurant Browser** — filter by cuisine, area, budget, visited status

---

## External API Integrations

| API | What It Does | Graceful Fallback |
|-----|-------------|-------------------|
| **Groq (Llama 3 70B)** | Metadata extraction, persona generation | Returns demo data |
| **Telegram Bot API** | User communication | Required (no fallback) |
| **OpenWeather** | Weather context for proactive triggers | Assumes clear weather |
| **Tavily Search** | Web search for cold-start users | Returns safe demo picks |
| **RapidAPI** | Instagram scraping for reels | Skips video scraping |
| **Google Gemini Vision** | Photo-based visit verification | Manual confirmation |
| **Nominatim (OSM)** | Free geocoding for discovery | Built-in, no key needed |

**Key Design Principle:** If any API fails or key is missing, the system gracefully degrades to simulation mode. The user experience stays smooth. The demo never crashes.

---

## Tech Stack Summary

| Layer | Technology | Why We Chose It |
|-------|-----------|----------------|
| Frontend | React 19 + Vite | Fast HMR, modern React features |
| Backend | Express.js + Node 22 | Mature ecosystem, async I/O for agent orchestration |
| Bot | Telegraf | Best Node.js Telegram library |
| Real-time | Socket.io | Reliable WebSocket with fallbacks |
| LLM | Groq (Llama 3 70B) | Sub-second inference on custom LPU hardware |
| Vision AI | Google Gemini | Best-in-class multimodal understanding |
| Math Engine | Python 3 | Clean algorithms for consensus math |
| Search | Tavily | Purpose-built AI search API |
| Geocoding | Nominatim | Free, open, no rate limits for hackathon |
| Storage | Local JSON | Zero infrastructure, sovereign by design |
| Styling | Tailwind CSS | Rapid UI development |

---

## What Makes CraveMap Different

### vs. Zomato / Google Maps
They are search engines. CraveMap is an agent. They forget you. CraveMap remembers everything. They wait for queries. CraveMap acts proactively.

### vs. Instagram Saved Posts
Instagram is a graveyard of saved content. CraveMap turns every save into structured, searchable, actionable intelligence.

### vs. Any Food App
No food app tracks craving cycles. No food app runs group consensus math. No food app stores data locally. CraveMap does all three.

---

## Conclusion

CraveMap reimagines how humans make food decisions. By combining multi-agent AI orchestration, behavioral learning, and sovereign data principles, it transforms scattered digital food signals into proactive, personalized intelligence — for individuals and groups alike.

The system is fully functional, production-ready, and designed to never fail during a demo.
