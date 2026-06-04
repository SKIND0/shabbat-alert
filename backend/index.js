const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { find } = require('geo-tz');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


// { sendSMS } = require('./twilio');

//app.get('/test-sms', async (req, res) => {
//    const result = await sendSMS('+1YOURNUMBER', 'Shabbat Alert test message 🕯️');
//    res.json(result);
//});

const { sendSMS } = require('./twilio');
const { buildShabbatMessage } = require('./scheduler');

app.get('/test-sms', async (req, res) => {
    if (!req.query.to) {
        return res.status(400).json({ error: 'Add ?to=+1XXXXXXXXXX (E.164 format)' });
    }
    const result = await sendSMS(req.query.to, 'Shabbat Alert test — Twilio is connected!');
    res.json(result);
});

app.get('/test-shabbat-sms', async (req, res) => {
    if (!req.query.to) {
        return res.status(400).json({ error: 'Add ?to=+1XXXXXXXXXX (E.164 format)' });
    }
    const candleAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const sunsetAt = new Date(candleAt.getTime() + 18 * 60 * 1000);
    const message = buildShabbatMessage(
        req.query.name || 'Friend',
        candleAt,
        sunsetAt,
        'America/New_York'
    );
    const result = await sendSMS(req.query.to, message);
    res.json({ ...result, preview: message });
});


app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ time: result.rows[0].now });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function normalizePhone(phone) {
    if (!phone) return '';
    const trimmed = String(phone).trim();
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (trimmed.startsWith('+')) return `+${digits}`;
    return trimmed;
}

function firstName(fullName) {
    const trimmed = (fullName || '').trim();
    return trimmed.split(/\s+/)[0] || 'there';
}

function describeAlertMinutes(minutesList) {
    const valid = minutesList.filter((m) => m > 0);
    if (valid.length === 0) return '18 minutes';
    if (valid.length === 1) {
        return `${valid[0]} minute${valid[0] === 1 ? '' : 's'}`;
    }
    return valid.map((m) => `${m} min`).join(' and ');
}

function buildWelcomeMessage(name, minutesList, locationLabel) {
    const city = (locationLabel || 'your city').split(',')[0].trim();
    return (
        `Welcome to Shabbat Alert, ${firstName(name)}! ` +
        `You'll get texts ${describeAlertMinutes(minutesList)} before candle lighting in ${city}. ` +
        `Reply STOP to unsubscribe.`
    );
}

function buildSettingsUpdatedMessage(name, minutesList, locationLabel) {
    const city = (locationLabel || 'your city').split(',')[0].trim();
    return (
        `Shabbat Alert: Preferences saved. ` +
        `Reminders ${describeAlertMinutes(minutesList)} before candle lighting in ${city}. ` +
        `Reply STOP to unsubscribe.`
    );
}

async function sendOptionalSMS(to, message, context) {
    try {
        const result = await sendSMS(to, message);
        if (!result.success) {
            console.error(`[${context}] SMS failed:`, result.error);
        }
        return result;
    } catch (err) {
        console.error(`[${context}] SMS error:`, err.message);
        return { success: false, error: err.message };
    }
}

function resolveTimezone(lat, lng) {
    const latN = Number(lat);
    const lngN = Number(lng);
    if (Number.isNaN(latN) || Number.isNaN(lngN)) return 'UTC';
    try {
        const zones = find(latN, lngN);
        if (zones?.length) return zones[0];
    } catch (err) {
        console.error('geo-tz failed:', err.message);
    }
    return 'UTC';
}

app.post('/api/signup', async (req, res) => {
    const { first_name, phone_number, location_lat, location_lng, location_label, zmanim_opinion, alert_preferences } = req.body;
    const phone = normalizePhone(phone_number);

    if (!first_name?.trim() || !phone) {
        return res.status(400).json({ error: 'Name and phone number are required' });
    }
    if (location_lat == null || location_lng == null) {
        return res.status(400).json({ error: 'A valid location is required' });
    }

    const opinion = ['gra', 'ma', 'rt'].includes(zmanim_opinion) ? zmanim_opinion : 'gra';

    try {
        const existing = await pool.query(`SELECT id FROM users WHERE phone = $1`, [phone]);

        if (existing.rows.length > 0) {
            return res.status(409).json({
                success: false,
                code: 'PHONE_EXISTS',
                error: 'This phone number is already registered. You can update your preferences instead.',
            });
        }

        const userResult = await pool.query(
            `INSERT INTO users (name, phone) VALUES ($1, $2) RETURNING id`,
            [first_name.trim(), phone]
        );
        const userId = userResult.rows[0].id;
        const timezone = resolveTimezone(location_lat, location_lng);

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
                [userId, minutes, opinion]
            );
        }

        await sendOptionalSMS(
            phone,
            buildWelcomeMessage(first_name, minutesList, location_label),
            'signup'
        );

        res.json({ success: true, userId });
    } catch (err) {
        console.error('Signup failed:', err.message);
        if (err.code === '23505') {
            return res.status(409).json({
                success: false,
                code: 'PHONE_EXISTS',
                error: 'This phone number is already registered. You can update your preferences instead.',
            });
        }
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
const { fetchAndCacheShabbatTimes, seedPresetLocations } = require('./hebcal');

app.post('/api/manage/lookup', async (req, res) => {
    const { phone_number } = req.body;
    if (!phone_number) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    const phone = normalizePhone(phone_number);

    try {
        const userResult = await pool.query(
            `SELECT u.id, u.name, ul.label AS location_label,
                    ul.latitude AS location_lat, ul.longitude AS location_lng,
                    up.zmanim_opinion, up.alert_minutes_before
             FROM users u
             INNER JOIN user_locations ul ON ul.user_id = u.id AND ul.is_primary = TRUE
             LEFT JOIN user_preferences up ON up.user_id = u.id
             WHERE u.is_active = TRUE AND u.phone = $1`,
            [phone]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'No active account found for this number' });
        }

        const row = userResult.rows[0];
        const alert_preferences = [
            ...new Set(userResult.rows.map((r) => r.alert_minutes_before).filter((m) => m != null)),
        ];

        res.json({
            success: true,
            userId: row.id,
            name: row.name,
            location_label: row.location_label,
            location_lat: row.location_lat,
            location_lng: row.location_lng,
            zmanim_opinion: row.zmanim_opinion || 'gra',
            alert_preferences: alert_preferences.length ? alert_preferences : [18],
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/preferences/:userId', async (req, res) => {
    const { userId } = req.params;
    const {
        location_lat,
        location_lng,
        location_label,
        zmanim_opinion,
        alert_preferences,
    } = req.body;

    if (!location_lat || !location_lng || !location_label) {
        return res.status(400).json({ error: 'A verified location is required' });
    }

    const minutesList = (Array.isArray(alert_preferences) ? alert_preferences : [18])
        .slice(0, 3)
        .map((m) => parseInt(m, 10))
        .filter((m) => !Number.isNaN(m) && m > 0);

    if (minutesList.length === 0) {
        return res.status(400).json({ error: 'At least one valid alert preference is required' });
    }

    try {
        const timezone = resolveTimezone(location_lat, location_lng);

        await pool.query(
            `UPDATE user_locations
             SET label = $1, latitude = $2, longitude = $3, timezone = $4
             WHERE user_id = $5 AND is_primary = TRUE
             RETURNING id`,
            [location_label, location_lat, location_lng, timezone, userId]
        );

        const locUpdate = await pool.query(
            `SELECT id FROM user_locations WHERE user_id = $1 AND is_primary = TRUE`,
            [userId]
        );
        if (locUpdate.rows[0]) {
            await pool.query(
                `DELETE FROM shabbos_times WHERE location_id = $1`,
                [locUpdate.rows[0].id]
            );
        }

        await pool.query(`DELETE FROM user_preferences WHERE user_id = $1`, [userId]);

        for (const minutes of minutesList) {
            await pool.query(
                `INSERT INTO user_preferences (user_id, alert_minutes_before, zmanim_opinion)
                 VALUES ($1, $2, $3)`,
                [userId, minutes, zmanim_opinion || 'gra']
            );
        }

        const userResult = await pool.query(
            `SELECT name, phone FROM users WHERE id = $1`,
            [userId]
        );
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            await sendOptionalSMS(
                user.phone,
                buildSettingsUpdatedMessage(user.name, minutesList, location_label),
                'preferences'
            );
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
            loc.timezone,
            loc.label
        );

        res.json(times);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Server error' });
    }
});

const { initScheduler } = require('./scheduler');
initScheduler();

seedPresetLocations().catch((err) => {
    console.error('Preset location seed failed (run migrations if tables are missing):', err.message);
});

app.listen(process.env.PORT || 3001, () => {
    console.log(`Server running on port ${process.env.PORT || 3001}`);
});