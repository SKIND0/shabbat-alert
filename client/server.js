const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const PORT = process.env.PORT || 3000;
const target = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');

const app = express();

console.log(`Shabbat Alert client on port ${PORT}`);
console.log(`Proxying /api, /test-db, /shabbat-times → ${target}`);

app.use(
    ['/api', '/test-db', '/shabbat-times'],
    createProxyMiddleware({
        target,
        changeOrigin: true,
    })
);

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('Ready');
});
