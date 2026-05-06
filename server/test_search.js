const axios = require('axios');

async function run() {
    try {
        console.log("Testing Chinese...");
        let res = await axios.post('http://localhost:5001/api/search-vault', { query: "suggest some spots having chinese cuisine" });
        console.log("Chinese filters:", res.data.filters);
        console.log("Chinese results:", res.data.results.length);

        console.log("\nTesting Rooftop...");
        res = await axios.post('http://localhost:5001/api/search-vault', { query: "rooftop spots for a date night" });
        console.log("Rooftop filters:", res.data.filters);
        console.log("Rooftop results:", res.data.results.length);

        console.log("\nTesting Indian...");
        res = await axios.post('http://localhost:5001/api/search-vault', { query: "suggest some indian spots" });
        console.log("Indian filters:", res.data.filters);
        console.log("Indian results:", res.data.results.length);
    } catch (e) {
        console.error("Error", e.message);
    }
}
run();
