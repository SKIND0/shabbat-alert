const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { find } = require('geo-tz');

const app = express();

// { sendSMS } = require('./twilio');

//app.get('/test-sms', async (req, res) => {
//    const result = await sendSMS('+1YOURNUMBER', 'Shabbat Alert test message 🕯️');
//    res.json(result);
//});

const { sendSMS } = require('./twilio');

app.get('/test-sms', async (req, res) => {
    const result = await sendSMS('+19293052813', 'Shabbat Alert test message 🕯️');
    res.json(result);
});


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

const { fetchAndCacheShabbatTimes } = require('./hebcal');

app.get('/shabbat-times/:userId', async (req, res) => {
    try {
        // Get user's primary location
        const location = await pool.query(
            `SELECT * FROM user_locations 
       WHERE user_id = $1 AND is_primary = true`,
            [req.params.userId]
        );

        if (location.rows.length === 0) {
            return res.status(404).json({ error: 'No location found for this user' });
        }

        const loc = location.rows[0];
        const times = await fetchAndCacheShabbatTimes(
            loc.id,
            loc.latitude,
            loc.longitude,
            loc.timezone
        );

        res.json(times);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.listen(3001, () => {
    console.log('Server running on port 3001');
});