const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { find } = require('geo-tz');

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ time: result.rows[0].now });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/signup', async (req, res) => {
    const { first_name, phone_number, location_lat, location_lng, location_label, zmanim_opinion, alert_preferences } = req.body;
    try {
        const userResult = await pool.query(
            `INSERT INTO users (name, phone) VALUES ($1, $2) RETURNING id`,
            [first_name, phone_number]
        );
        const userId = userResult.rows[0].id;
        const timezone = find(location_lat, location_lng)[0];

        await pool.query(
            `INSERT INTO user_locations (user_id, label, latitude, longitude, timezone) VALUES ($1, $2, $3, $4, $5)`,
            [userId, location_label, location_lat, location_lng, timezone]
        );

        await pool.query(
            `INSERT INTO user_preferences (user_id, alert_minutes_before, zmanim_opinion) VALUES ($1, $2, $3)`,
            [userId, alert_preferences[0], zmanim_opinion]
        );

        res.json({ success: true, userId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3001, () => {
    console.log('Server running on port 3001');
});