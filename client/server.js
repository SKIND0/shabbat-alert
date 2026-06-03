const express = require('express');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const buildDir = path.join(__dirname, 'build');

function normalizeApiUrl(raw) {
    if (!raw) return '';
    let url = String(raw).trim().replace(/\/$/, '');
    if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
    }
    return url;
}

const apiUrl = normalizeApiUrl(process.env.REACT_APP_API_URL);

if (!apiUrl) {
    console.error('Missing REACT_APP_API_URL on this Railway service.');
    console.error('Set it to your BACKEND url, e.g. https://backend-production-2ae7.up.railway.app');
    process.exit(1);
}

fs.mkdirSync(buildDir, { recursive: true });
fs.writeFileSync(
    path.join(buildDir, 'config.json'),
    JSON.stringify({ apiUrl }, null, 2)
);

console.log('Serving client on port', PORT);
console.log('Browser will call backend:', apiUrl);

const app = express();
app.use(express.static(buildDir));

app.get('*', (req, res) => {
    res.sendFile(path.join(buildDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('Ready');
});
