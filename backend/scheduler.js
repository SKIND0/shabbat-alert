const cron = require('node-cron');
const pool = require('./db');
const { sendSMS } = require('./twilio');
const { fetchAndCacheShabbatTimes } = require('./hebcal');

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

function buildShabbatMessage(name, candleLightingUtc, timezone) {
    const time = formatLocalTime(candleLightingUtc, timezone);
    const base = `Hey ${firstName(name)}, Shabbat starts at ${time} tonight. Shabbat Shalom!`;
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
        GROUP BY u.id, u.name, u.phone, ul.id, ul.latitude, ul.longitude, ul.timezone
    `);
    return rows;
}

/**
 * Runs on Fridays: fetch/cache candle times and queue pending rows in alert_log.
 */
async function planShabbatAlerts() {
    console.log('[scheduler] Planning Shabbat alerts...');
    const users = await getActiveUsersWithPreferences();
    let planned = 0;

    for (const user of users) {
        try {
            const times = await fetchAndCacheShabbatTimes(
                user.location_id,
                user.latitude,
                user.longitude,
                user.timezone
            );

            const candleUtc = new Date(times.candle_lighting_utc);
            const minutesList = [...new Set(user.alert_minutes.map(Number))];

            for (const minutes of minutesList) {
                const scheduledFor = new Date(candleUtc.getTime() - minutes * 60 * 1000);

                if (scheduledFor <= new Date()) {
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
        } catch (err) {
            console.error(`[scheduler] Failed to plan for user ${user.user_id}:`, err.message);
        }
    }

    console.log(`[scheduler] Planned ${planned} alert(s) for ${users.length} active user(s)`);
    return planned;
}

/**
 * Sends any pending alerts whose scheduled_for time has passed.
 */
async function sendDueAlerts() {
    const { rows } = await pool.query(`
        SELECT
            al.id AS alert_id,
            u.name,
            u.phone,
            ul.timezone,
            st.candle_lighting_utc
        FROM alert_log al
        INNER JOIN users u ON u.id = al.user_id AND u.is_active = TRUE
        INNER JOIN shabbos_times st ON st.id = al.shabbos_time_id
        INNER JOIN user_locations ul ON ul.user_id = u.id AND ul.is_primary = TRUE
        WHERE al.status = 'pending'
          AND al.alert_type = 'candle_lighting'
          AND al.scheduled_for <= NOW()
    `);

    for (const alert of rows) {
        const message = buildShabbatMessage(
            alert.name,
            alert.candle_lighting_utc,
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
    // Friday 8:00 AM — queue this week's alerts (America/New_York)
    cron.schedule(
        '0 8 * * 5',
        () => {
            planShabbatAlerts().catch((err) => {
                console.error('[scheduler] Friday planning failed:', err);
            });
        },
        { timezone: 'America/New_York' }
    );

    // Every minute — deliver alerts when scheduled_for is reached
    cron.schedule('* * * * *', () => {
        sendDueAlerts().catch((err) => {
            console.error('[scheduler] Send due alerts failed:', err);
        });
    });

    console.log('[scheduler] Registered: Friday 8 AM planning, every-minute send');
}

module.exports = {
    initScheduler,
    planShabbatAlerts,
    sendDueAlerts,
    buildShabbatMessage,
};
