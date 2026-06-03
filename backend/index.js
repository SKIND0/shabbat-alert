const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { find } = require('geo-tz');

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


// { sendSMS } = require('./twilio');

//app.get('/test-sms', async (req, res) => {
//    const result = await sendSMS('+1YOURNUMBER', 'Shabbat Alert test message 🕯️');
//    res.json(result);
//});

const { sendSMS } = require('./twilio');

app.get('/test-sms', async (req, res) => {
    const result = await sendSMS(req.query.to, 'test');
    res.json(result);
});


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

        const minutesList = (Array.isArray(alert_preferences) ? alert_preferences : [18])
            .slice(0, 3)
            .map((m) => parseInt(m, 10))
            .filter((m) => !Number.isNaN(m) && m > 0);

        if (minutesList.length === 0) {
            return res.status(400).json({ error: 'At least one valid alert preference is required' });
        }

        for (const minutes of minutesList) {
            await pool.query(
                `INSERT INTO user_preferences (user_id, alert_minutes_before, zmanim_opinion) VALUES ($1, $2, $3)`,
                [userId, minutes, zmanim_opinion]
            );
        }

        res.json({ success: true, userId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/webhook/stop', async (req, res) => {
    const from = req.body.From;
    if (!from) {
        return res.status(400).send('Missing From');
    }

    try {
        await pool.query(
            `UPDATE users SET is_active = false WHERE phone = $1`,
            [from]
        );
        res.type('text/xml').status(200).send(
            '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
        );
    } catch (err) {
        console.error('STOP webhook error:', err.message);
        res.status(500).send('Error');
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


const { initScheduler } = require('./scheduler');
initScheduler();

app.listen(process.env.PORT || 3001, () => {
    console.log(`Server running on port ${process.env.PORT || 3001}`);
});