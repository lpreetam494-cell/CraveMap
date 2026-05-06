const { spawn } = require('child_process');
const path = require('path');

const pyPath = path.resolve(__dirname, 'python_services', 'ingestion.py');
const url = "https://www.instagram.com/reel/DVit8dND6Gh/?igsh=MWlmazBza3kwMGNnaA==";

console.log("Spawning python...");
const py = spawn('python', [pyPath, url], {
    cwd: path.resolve(__dirname, 'python_services')
});

py.stdout.on('data', data => console.log(`STDOUT: ${data.toString()}`));
py.stderr.on('data', data => console.log(`STDERR: ${data.toString()}`));
py.on('close', code => console.log(`Process exited with code ${code}`));
