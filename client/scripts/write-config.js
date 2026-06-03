const fs = require('fs');
const path = require('path');

const apiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const buildDir = path.join(__dirname, '..', 'build');
const out = path.join(buildDir, 'config.json');

fs.mkdirSync(buildDir, { recursive: true });
fs.writeFileSync(out, JSON.stringify({ apiUrl }, null, 2));
console.log('Wrote build/config.json →', apiUrl);
