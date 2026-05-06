const { extractRestaurantData } = require('./skills/social_hunter');

async function run() {
    console.log("Testing Social Hunter...");
    try {
        const result = await extractRestaurantData("https://www.instagram.com/reel/DVit8dND6Gh/?igsh=MWlmazBza3kwMGNnaA==");
        console.log("FINAL RESULT:", JSON.stringify(result, null, 2));
    } catch (err) {
        console.error("TEST FAILED:", err);
    }
}

run();
