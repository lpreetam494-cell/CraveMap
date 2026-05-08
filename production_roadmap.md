# CraveMap: Phased Production Roadmap
**From Hackathon MVP to Full-Fledged Sovereign App**

---

## Phase 1: MVP Core (Achieved ✅)
The foundational architecture required to ingest, analyze, and retrieve personalized food data.
*   **Live Communication Layer:** Fully implemented `Telegraf` (Telegram Bot API) listener handling text, interactive inline-keyboards for onboarding, and forwarding media links.
*   **Ambient Awareness:** Integrated `OpenWeatherMap` API to trigger Lifestyle Operator logic (e.g., suggesting ramen on rainy days).
*   **Intelligent Enrichment:** Built a "Self-Healing" data pipeline using Tavily Web Search and Groq (LLaMA 3) to automatically fill in missing restaurant data (cuisine, budget, vibe).
*   **Sovereignty Core:** Transitioned from a monolithic data structure to strict Per-User Sovereign Vaults (`user_{telegramId}.json`), ensuring absolute data isolation.

## Phase 2: Security & Performance Hardening (Achieved ✅)
Essential infrastructure patches to ensure the local MVP can survive rigorous testing and demo environments without crashing.
*   **Defeated RCE:** Replaced vulnerable shell executions (`exec`) with secure `execFile` calls to neutralize command injection attacks from malicious Instagram URLs.
*   **Zero-Trust API Auth:** Implemented an internal secret `X-API-KEY` handshake between the Express API and the Telegram Bot to prevent ID spoofing.
*   **Rate Limiting:** Added in-memory spam protection to prevent users from crashing Google Gemini quotas.
*   **Event Loop Optimization:** Migrated all database reads to modern async Promises (`fs.promises`), preventing the Node.js server from freezing during heavy loads.

## Phase 3: Frontend Polish & A2 UI Integration (Upcoming 🚧)
The hackathon places a massive emphasis on visual aesthetics and user experience.
*   **A2 UI Implementation:** Overhaul the entire React frontend to utilize the **A2 UI** design system. This will ensure the interface is stunning, responsive, and meets the strict UI rules of the hackathon.
*   **Dynamic Dashboards:** Replace static CSS bars with interactive, animated data visualizations for the Intelligence Dashboard.
*   **PWA Offline Mode:** Use a Service Worker so users can view their Sovereign Bucket List without an internet connection.

## Phase 4: Location Intelligence & Google Maps (Upcoming 🚧)
Moving from text-based guessing to absolute geospatial coordinates for real-world viability.
*   **API Integration:** Hook into the [Google Places API](https://developers.google.com/maps/documentation/places/web-service/overview).
*   **Implementation:** 
    *   When the bot extracts a name, it will ping Google to fetch the precise `place_id`, `lat/long` coordinates, and the direct Google Maps routing link.
    *   This enables the Group Consensus engine to calculate actual travel times using the Google Distance Matrix API.

## Phase 5: Cloud Database Migration (Final Phase 🚀)
The ultimate step to move from a "Local-First" prototype to a massively scalable cloud application.
*   **Tech Stack:** Migrate from local JSON files to [MongoDB Atlas](https://www.mongodb.com/atlas/database) or Supabase.
*   **Implementation:** 
    *   Because our data is already structured perfectly as JSON documents (profiles, restaurants array, etc.), migrating to MongoDB collections will require minimal refactoring of `vault_router.js`.
    *   This migration is strictly required before deploying the Express backend to a cloud platform like Render or AWS, as local files do not persist across cloud server restarts.
*   **End-to-End Encryption:** Implement `AES-256` encryption at the database level to maintain the "Sovereign" privacy promise, even in the cloud.

---

## Full Tech Stack Target
| Layer | Technology |
|---|---|
| **Frontend** | React (Vite) + **A2 UI** + Framer Motion |
| **Backend** | Node.js + Express + Socket.io |
| **Agents** | Groq (Llama 3) + Python Ingestion Engine |
| **Database** | MongoDB Atlas (User Data) + Redis (Agent State) |
| **APIs** | Telegram, Google Maps, OpenWeather, Tavily |
| **Deployment** | Vercel (Frontend), Render/AWS (Backend) |
