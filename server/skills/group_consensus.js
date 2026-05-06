/**
 * Advanced Group Consensus Engine Skill
 * Calls the Python 'Social Brain' mathematical core.
 */
const { spawn } = require('child_process');
const path = require('path');

const findBestRestaurant = (groupVaults, constraints) => {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [path.resolve(__dirname, '..', 'python_services', 'social_brain.py')]);

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

        const payload = JSON.stringify({
            vaults: groupVaults,
            constraints: constraints || {}
        });

        pythonProcess.stdin.write(payload);
        pythonProcess.stdin.end();
    });
};

module.exports = { findBestRestaurant };
