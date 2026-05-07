/**
 * PART 2: FastAPI Microservice Migration
 * Advanced Group Consensus Engine Skill
 * 
 * Instead of spawning Python processes, calls persistent FastAPI microservice
 * on localhost:8000, reducing latency by 500ms-1s per request.
 */
const axios = require('axios');

const FASTAPI_ENDPOINT = 'http://127.0.0.1:8000';  // LOCAL ONLY - Part 3 Enforcement

const findBestRestaurant = async (payloadObj) => {
    try {
        console.log('📡 Calling FastAPI Social Brain microservice...');
        
        const response = await axios.post(
            `${FASTAPI_ENDPOINT}/process-social-brain`,
            payloadObj,
            { timeout: 5000 }
        );

        if (response.data.error) {
            throw new Error(response.data.error);
        }

        return response.data;

    } catch (err) {
        console.error('❌ FastAPI Social Brain Error:', err.message);
        
        // Graceful fallback if microservice is down
        console.log('⚠️  FastAPI unavailable. Using legacy Python spawn as fallback...');
        return await findBestRestaurantLegacy(payloadObj);
    }
};

/**
 * Legacy fallback: Spawn Python process if FastAPI is unavailable
 */
const findBestRestaurantLegacy = (payloadObj) => {
    const { spawn } = require('child_process');
    const path = require('path');

    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python3', [path.resolve(__dirname, '..', 'python_services', 'social_brain.py')]);

        let stdoutData = '';
        let stderrData = '';

        pythonProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error("❌ Social Brain Error:", stderrData);
                return reject(new Error(stderrData || "Python process exited with code " + code));
            }
            try {
                const result = JSON.parse(stdoutData);
                if (result.error) {
                    return reject(new Error(result.error));
                }
                resolve(result);
            } catch (err) {
                reject(new Error("Failed to parse Social Brain output: " + stdoutData));
            }
        });

        const payload = JSON.stringify(payloadObj);
        pythonProcess.stdin.write(payload);
        pythonProcess.stdin.end();
    });
};

module.exports = { findBestRestaurant };
