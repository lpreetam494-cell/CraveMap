const axios = require('axios');

const simulateSave = async () => {
    console.log("🚀 Simulating: User sends Telegram message...");
    console.log("💬 Message: 'Save Rameshwaram Cafe, Brookefield, around 200 per person'");
    
    try {
        const saveRes = await axios.post('http://localhost:5000/api/save', {
            text: "Save Rameshwaram Cafe, Brookefield, around 200 per person"
        });
        
        if (saveRes.data.success) {
            console.log("✅ Social Hunter extracted metadata!");
            console.log("📍 Added to Bucket List:", saveRes.data.entry.name);
            
            console.log("\n🧠 Step 2: Simulating Proactive Intelligence...");
            await new Promise(r => setTimeout(r, 2000));
            const thinkRes = await axios.post('http://localhost:5000/api/think');
            console.log(`✅ Lifestyle Operator generated ${thinkRes.data.triggers.length} proactive alerts!`);
            
            console.log("\n🗳️ Step 3: Resolving Group Decision...");
            await new Promise(r => setTimeout(r, 2000));
            const groupRes = await axios.post('http://localhost:5000/api/group-decision', {
                groupPrefs: [
                    { preferredCuisines: ['Japanese'], maxBudget: 50, maxDistance: 10 },
                    { preferredCuisines: ['Italian'], maxBudget: 40, maxDistance: 5 }
                ]
            });
            console.log("✅ Consensus reached! Poll drafted for Friday Night Group.");
            console.log("\n✨ DEMO COMPLETE: Refresh your dashboard to see the live thought stream!");
        }
    } catch (err) {
        console.error("❌ Failed to simulate save. Is the server running on port 5000?");
    }
};

simulateSave();
