# CraveMap: Production Roadmap
**From Hackathon MVP to Full-Fledged Sovereign App**

---

## 1. Communication Layer (Real Telegram Bot)
The MVP uses a simulation script. For production, we need a live listener.
*   **API:** [Telegraf (Telegram Bot API)](https://telegraf.js.org/)
*   **Implementation:**
    ```javascript
    const { Telegraf } = require('telegraf');
    const bot = new Telegraf(process.env.BOT_TOKEN);
    
    bot.on('message', async (ctx) => {
        const text = ctx.message.text;
        // Forward to Social Hunter Agent
        const res = await axios.post('http://localhost:5000/api/save', { text });
        ctx.reply(`📍 Saved ${res.data.entry.name} to your Sovereign Bucket List!`);
    });
    ```

## 2. Location Intelligence (Google Maps)
The MVP uses mock coordinates. Production needs real spatial data.
*   **API:** [Google Places API](https://developers.google.com/maps/documentation/places/web-service/overview) or [Geoapify](https://www.geoapify.com/).
*   **Implementation:**
    *   **Extraction:** Use the API to get `place_id`, `rating`, `geometry`, and `price_level`.
    *   **Distance Matrix:** Calculate travel times for Group Consensus using the `Distance Matrix API`.

## 3. Ambient Awareness (Weather & Time)
*   **API:** [OpenWeatherMap API](https://openweathermap.org/api)
*   **Implementation:**
    *   Fetch weather for the user's `current_location` every 30 minutes.
    *   Trigger `Lifestyle Operator` logic if `weather.main === 'Rain'` or `temp < 10`.

## 4. Multi-User Persistence (Cloud Storage)
The MVP uses a local `JSON` file. Production needs a scalable database.
*   **Tech:** [MongoDB Atlas](https://www.mongodb.com/atlas/database) or [Supabase](https://supabase.com/).
*   **Architecture:**
    *   Each user has a `FoodBrain` document.
    *   Groups are represented as shared documents with `member_ids` and `weighted_preferences`.

## 5. Security & Sovereignty
To maintain the "Sovereign" promise:
*   **End-to-End Encryption:** Use `AES-256` for restaurant notes.
*   **Self-Hosting Option:** Package the `server` as a Docker container so users can host their own "Food Brain" on a Raspberry Pi or local server.

## 6. Frontend Polish
*   **Framework:** Deploy the Vite app to **Vercel** or **Netlify**.
*   **Charts:** Replace the CSS bars with [Recharts](https://recharts.org/) for the Intelligence Dashboard.
*   **Offline Mode:** Use a Service Worker (PWA) to allow users to view their Bucket List without internet.

---

## Full Tech Stack (Target)
| Layer | Technology |
|---|---|
| **Frontend** | React (Vite) + Tailwind CSS + Framer Motion |
| **Backend** | Node.js + Express + Socket.io |
| **Agents** | Groq (Llama 3) + OpenClaw Orchestration |
| **Database** | MongoDB (User Data) + Redis (Agent State) |
| **APIs** | Telegram, Google Maps, OpenWeather |
| **Deployment** | Vercel (Frontend), Render/AWS (Backend) |
