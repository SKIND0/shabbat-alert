const cron = require('node-cron');
const pool = require('./db');
const { sendSMS } = require('./twilio');
const { fetchAndCacheShabbatTimes } = require('./hebcal');
const { sanitizeAlertMinutes, MIN_ALERT_MINUTES, MAX_ALERT_MINUTES } = require('./alertLimits');

function firstName(fullName) {
    const trimmed = (fullName || '').trim();
    return trimmed.split(/\s+/)[0] || 'there';
}

function formatLocalTime(utcValue, timezone) {
    return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(new Date(utcValue));
}

function getLocalHourAndWeekday(timezone, date = new Date()) {
    const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short',
    }).format(date);
    const hour = Number(
        new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            hour12: false,
        }).format(date)
    );
    return { weekday, hour, isFriday: weekday === 'Fri' };
}

function buildShabbatMessage(name, candleLightingUtc, sunsetUtc, timezone) {
    const candles = formatLocalTime(candleLightingUtc, timezone);
    const sunset = formatLocalTime(sunsetUtc, timezone);
    const base =
        `Hey ${firstName(name)}, candle lighting at ${candles} (Shabbat starts ${sunset}). Shabbat Shalom!`;
    const clientUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');
    if (clientUrl) {
        return `${base} On vacation? Update your location: ${clientUrl}/preferences`;
    }
    return `${base} On vacation? Update your location on the Shabbat Alert site.`;
}

async function getActiveUsersWithPreferences() {
    const { rows } = await pool.query(`
        SELECT
            u.id AS user_id,
            u.name,
            u.phone,
            ul.id AS location_id,
            ul.label AS location_label,
            ul.latitude,
            ul.longitude,
            ul.timezone,
            COALESCE(
                array_agg(up.alert_minutes_before ORDER BY up.alert_minutes_before DESC)
                    FILTER (WHERE up.alert_minutes_before IS NOT NULL),
                ARRAY[18]
            ) AS alert_minutes
        FROM users u
        INNER JOIN user_locations ul
            ON ul.user_id = u.id AND ul.is_primary = TRUE
        LEFT JOIN user_preferences up ON up.user_id = u.id
        WHERE u.is_active = TRUE
        GROUP BY u.id, u.name, u.phone, ul.id, ul.label, ul.latitude, ul.longitude, ul.timezone
    `);
    return rows;
}

async function getUserForPlanning(userId) {
    const { rows } = await pool.query(
        `
        SELECT
            u.id AS user_id,
            u.name,
            u.phone,
            ul.id AS location_id,
            ul.label AS location_label,
            ul.latitude,
            ul.longitude,
            ul.timezone,
            COALESCE(
                array_agg(up.alert_minutes_before ORDER BY up.alert_minutes_before DESC)
                    FILTER (WHERE up.alert_minutes_before IS NOT NULL),
                ARRAY[18]
            ) AS alert_minutes
        FROM users u
        INNER JOIN user_locations ul
            ON ul.user_id = u.id AND ul.is_primary = TRUE
        LEFT JOIN user_preferences up ON up.user_id = u.id
        WHERE u.is_active = TRUE AND u.id = $1
        GROUP BY u.id, u.name, u.phone, ul.id, ul.label, ul.latitude, ul.longitude, ul.timezone
        `,
        [userId]
    );
    return rows[0] || null;
}

async function planAlertsForUserRecord(user) {
    const times = await fetchAndCacheShabbatTimes(
        user.location_id,
        user.latitude,
        user.longitude,
        user.timezone,
        user.location_label
    );

    const candleUtc = new Date(times.candle_lighting_utc);
    const now = new Date();
    const minutesList = sanitizeAlertMinutes(user.alert_minutes);
    let planned = 0;

    for (const minutes of minutesList) {
        const scheduledFor = new Date(candleUtc.getTime() - minutes * 60 * 1000);

        if (scheduledFor <= now) {
            console.log(
                `[scheduler] Skipping past alert for user ${user.user_id} (${minutes} min before)`
            );
            continue;
        }

        const existing = await pool.query(
            `SELECT id FROM alert_log
             WHERE user_id = $1
               AND shabbos_time_id = $2
               AND alert_type = 'candle_lighting'
               AND scheduled_for = $3`,
            [user.user_id, times.id, scheduledFor]
        );

        if (existing.rows.length > 0) {
            continue;
        }

        await pool.query(
            `INSERT INTO alert_log
                (user_id, shabbos_time_id, alert_type, scheduled_for, status)
             VALUES ($1, $2, 'candle_lighting', $3, 'pending')`,
            [user.user_id, times.id, scheduledFor]
        );
        planned++;
    }

    return planned;
}

/**
 * Plan this week's alerts for one user (signup, prefs change, or Friday 8 AM local).
 */
async function planAlertsForUser(userId) {
    const user = await getUserForPlanning(userId);
    if (!user) {
        return 0;
    }
    try {
        const planned = await planAlertsForUserRecord(user);
        if (planned > 0) {
            console.log(`[scheduler] Planned ${planned} alert(s) for user ${userId}`);
        }
        return planned;
    } catch (err) {
        console.error(`[scheduler] Failed to plan for user ${userId}:`, err.message);
        return 0;
    }
}

/**
 * Each hour: users whose local time is Friday 8:00–8:59 AM get this week's alerts queued.
 */
async function runHourlyFridayPlanning() {
    const users = await getActiveUsersWithPreferences();
    let planned = 0;

    for (const user of users) {
        const { isFriday, hour } = getLocalHourAndWeekday(user.timezone);
        if (!isFriday || hour !== 8) {
            continue;
        }
        try {
            planned += await planAlertsForUserRecord(user);
        } catch (err) {
            console.error(`[scheduler] Friday planning failed for ${user.user_id}:`, err.message);
        }
    }

    if (planned > 0) {
        console.log(`[scheduler] Hourly Friday planning queued ${planned} alert(s)`);
    }
    return planned;
}

async function planShabbatAlerts() {
    return runHourlyFridayPlanning();
}

/**
 * Sends pending alerts whose scheduled_for time has passed.
 */
async function sendDueAlerts() {
    const { rows } = await pool.query(`
        SELECT
            al.id AS alert_id,
            u.name,
            u.phone,
            ul.timezone,
            st.candle_lighting_utc,
            st.sunset_utc
        FROM alert_log al
        INNER JOIN users u ON u.id = al.user_id AND u.is_active = TRUE
        INNER JOIN shabbos_times st ON st.id = al.shabbos_time_id
        INNER JOIN user_locations ul ON ul.user_id = u.id AND ul.is_primary = TRUE
        WHERE al.status = 'pending'
          AND al.alert_type = 'candle_lighting'
          AND al.scheduled_for <= NOW()
          AND st.candle_lighting_utc > NOW()
    `);

    for (const alert of rows) {
        const message = buildShabbatMessage(
            alert.name,
            alert.candle_lighting_utc,
            alert.sunset_utc,
            alert.timezone
        );
        const result = await sendSMS(alert.phone, message);

        await pool.query(
            `UPDATE alert_log
             SET status = $1,
                 sent_at = NOW(),
                 twilio_sid = $2,
                 error_message = $3
             WHERE id = $4`,
            [
                result.success ? 'sent' : 'failed',
                result.sid || null,
                result.error || null,
                alert.alert_id,
            ]
        );
    }

    if (rows.length > 0) {
        console.log(`[scheduler] Sent ${rows.length} due alert(s)`);
    }

    return rows.length;
}

function initScheduler() {
    // Every hour — plan for users where it's Friday 8 AM in their timezone
    cron.schedule('0 * * * *', () => {
        runHourlyFridayPlanning().catch((err) => {
            console.error('[scheduler] Hourly Friday planning failed:', err);
        });
    });

    // Friday & Saturday UTC — send queued texts until candle-lighting passes
    cron.schedule('* * * * 5,6', () => {
        sendDueAlerts().catch((err) => {
            console.error('[scheduler] Send due alerts failed:', err);
        });
    });

    console.log(
        '[scheduler] Registered: hourly Friday-8AM-local planning, Fri/Sat send window'
    );
}

module.exports = {
    initScheduler,
    planShabbatAlerts,
    planAlertsForUser,
    runHourlyFridayPlanning,
    sendDueAlerts,
    buildShabbatMessage,
    MIN_ALERT_MINUTES,
    MAX_ALERT_MINUTES,
};
