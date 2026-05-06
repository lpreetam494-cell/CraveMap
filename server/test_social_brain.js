const { findBestRestaurant } = require('./skills/group_consensus');
const fs = require('fs');
const path = require('path');

const readVault = (filename) => JSON.parse(fs.readFileSync(path.join(__dirname, 'memory', filename), 'utf8'));

async function testGroupDecision() {
    try {
        console.log("Triggering Social Brain Consensus Engine directly...");
        const groupVaults = {
            "Akash": readVault('food_memory.json'),
            "Rohan": readVault('rohan_vault.json'),
            "Priya": readVault('priya_vault.json')
        };
        const constraints = {
            vetoes: ["pizza", "seafood"],
            max_budget: 1000
        };
        
        const result = await findBestRestaurant(groupVaults, constraints);
        console.log("\n=== CONSENSUS RESULT ===");
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Error:", error.message);
    }
}

testGroupDecision();
