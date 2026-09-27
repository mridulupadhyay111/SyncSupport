const fs = require('fs');
const { execSync } = require('child_process');

const fePath = fs.existsSync('frontend') ? 'frontend' : fs.existsSync('../frontend') ? '../frontend' : '.';
const bePath = fs.existsSync('backend') ? 'backend' : '.';

console.log(`[Render Build] Auto-detected Frontend path: "${fePath}"`);
console.log(`[Render Build] Auto-detected Backend path: "${bePath}"`);

console.log(`[Render Build] Installing & building frontend...`);
execSync(`cd "${fePath}" && npm install && npm run build`, { stdio: 'inherit' });

console.log(`[Render Build] Installing backend dependencies...`);
execSync(`cd "${bePath}" && npm install`, { stdio: 'inherit' });

console.log(`[Render Build] Universal Build Completed Successfully!`);
