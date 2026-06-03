const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const PORT = process.env.PORT || 3000;
const target = process.env.REACT_APP_API_URL?.replace(/\/$/, '');

if (!target) {
    console.error('REACT_APP_API_URL must be set to your backend Railway URL (e.g. https://backend-production-xxxx.up.railway.app)');
    process.exit(1);
}

const app = express();

const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
        error(err, req, res) {
            console.error('Proxy error:', err.message, '→', target);
            if (!res.headersSent) {
                res.status(502).json({
                    error: 'Backend unreachable. Check REACT_APP_API_URL on the client service.',
                    detail: err.message,
                });
            }
        },
    },
});

app.use('/api', proxy);
app.use('/test-db', proxy);
app.use('/shabbat-times', proxy);

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Client on port ${PORT}, proxying to ${target}`);
});
