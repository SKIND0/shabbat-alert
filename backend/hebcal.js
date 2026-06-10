const pool = require('./db');
const { findPreset, roundCoord, PRESET_LOCATIONS } = require('./presetLocations');

const CANDLE_MINUTES_BEFORE_SUNSET = 18;
/** Hebcal Shabbat API category for when Shabbat ends (stored internally only; no end-of-Shabbat alerts). */
const HEBCAL_SHABBAT_END_CATEGORY = 'havdalah';

async function fetchShabbatFromHebcal(latitude, longitude, timezone) {
    const url =
        `https://www.hebcal.com/shabbat?cfg=json&latitude=${latitude}` +
        `&longitude=${longitude}&tzid=${encodeURIComponent(timezone)}&M=on&b=${CANDLE_MINUTES_BEFORE_SUNSET}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Hebcal shabbat API failed (${response.status})`);
    }
    const data = await response.json();

    const candles = data.items.find((i) => i.category === 'candles');
    const shabbatEnd = data.items.find((i) => i.category === HEBCAL_SHABBAT_END_CATEGORY);
    const parasha = data.items.find((i) => i.category === 'parashat');

    if (!candles) {
        throw new Error('Could not find candle lighting time');
    }

    const parashaDate = candles.date.split('T')[0];
    const sunset = await fetchSunset(latitude, longitude, timezone, parashaDate);
    const shabbatEndUtc = shabbatEnd
        ? new Date(shabbatEnd.date).toISOString()
        : new Date(new Date(sunset).getTime() + 25 * 60 * 60 * 1000).toISOString();

    return {
        parasha_date: parashaDate,
        parasha_name: parasha ? parasha.title : null,
        candle_lighting_utc: new Date(candles.date).toISOString(),
        sunset_utc: sunset,
        shabbat_end_utc: shabbatEndUtc,
    };
}

async function fetchSunset(latitude, longitude, timezone, date) {
    const url =
        `https://www.hebcal.com/zmanim?cfg=json&latitude=${latitude}` +
        `&longitude=${longitude}&tzid=${encodeURIComponent(timezone)}&date=${date}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Hebcal zmanim API failed (${response.status})`);
    }
    const data = await response.json();
    if (!data.times?.sunset) {
        throw new Error('Could not find sunset time');
    }
    return new Date(data.times.sunset).toISOString();
}

async function getSharedCache(preset, latitude, longitude, parashaDate) {
    if (preset) {
        const { rows } = await pool.query(
            `SELECT * FROM shabbos_times_cache
             WHERE preset_location_id = (
                 SELECT id FROM preset_locations WHERE label = $1 LIMIT 1
             )
             AND parasha_date = $2`,
            [preset.label, parashaDate]
        );
        return rows[0] || null;
    }

    const latKey = roundCoord(latitude);
    const lngKey = roundCoord(longitude);
    const { rows } = await pool.query(
        `SELECT * FROM shabbos_times_cache
         WHERE preset_location_id IS NULL
           AND cache_lat = $1 AND cache_lng = $2
           AND parasha_date = $3`,
        [latKey, lngKey, parashaDate]
    );
    return rows[0] || null;
}

async function saveSharedCache(preset, latitude, longitude, times) {
    const existing = await getSharedCache(preset, latitude, longitude, times.parasha_date);

    if (existing) {
        await pool.query(
            `UPDATE shabbos_times_cache
             SET parasha_name = $1,
                 candle_lighting_utc = $2,
                 sunset_utc = $3,
                 havdalah_utc = $4,
                 fetched_at = NOW()
             WHERE id = $5`,
            [
                times.parasha_name,
                times.candle_lighting_utc,
                times.sunset_utc,
                times.shabbat_end_utc,
                existing.id,
            ]
        );
        return;
    }

    if (preset) {
        const presetRow = await pool.query(
            `SELECT id FROM preset_locations WHERE label = $1 LIMIT 1`,
            [preset.label]
        );
        const presetId = presetRow.rows[0]?.id;
        if (presetId) {
            await pool.query(
                `INSERT INTO shabbos_times_cache
                    (preset_location_id, parasha_date, parasha_name,
                     candle_lighting_utc, sunset_utc, havdalah_utc)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    presetId,
                    times.parasha_date,
                    times.parasha_name,
                    times.candle_lighting_utc,
                    times.sunset_utc,
                    times.shabbat_end_utc,
                ]
            );
            return;
        }
    }

    const latKey = roundCoord(latitude);
    const lngKey = roundCoord(longitude);
    await pool.query(
        `INSERT INTO shabbos_times_cache
            (cache_lat, cache_lng, parasha_date, parasha_name,
             candle_lighting_utc, sunset_utc, havdalah_utc)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
            latKey,
            lngKey,
            times.parasha_date,
            times.parasha_name,
            times.candle_lighting_utc,
            times.sunset_utc,
            times.shabbat_end_utc,
        ]
    );
}

async function upsertUserShabbosTimes(locationId, times) {
    const endUtc = times.shabbat_end_utc || times.havdalah_utc;
    const result = await pool.query(
        `INSERT INTO shabbos_times
            (location_id, parasha_date, parasha_name,
             candle_lighting_utc, sunset_utc, havdalah_utc)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (location_id, parasha_date) DO UPDATE
           SET parasha_name = EXCLUDED.parasha_name,
               candle_lighting_utc = EXCLUDED.candle_lighting_utc,
               sunset_utc = EXCLUDED.sunset_utc,
               havdalah_utc = EXCLUDED.havdalah_utc
         RETURNING *`,
        [
            locationId,
            times.parasha_date,
            times.parasha_name,
            times.candle_lighting_utc,
            times.sunset_utc,
            endUtc,
        ]
    );
    return result.rows[0];
}

async function fetchAndCacheShabbatTimes(locationId, latitude, longitude, timezone, label) {
    const preset = findPreset(latitude, longitude, label);

    const cachedUser = await pool.query(
        `SELECT * FROM shabbos_times
         WHERE location_id = $1 AND parasha_date >= CURRENT_DATE
         ORDER BY parasha_date ASC LIMIT 1`,
        [locationId]
    );
    if (cachedUser.rows.length > 0) {
        return cachedUser.rows[0];
    }

    const fresh = await fetchShabbatFromHebcal(latitude, longitude, timezone);
    let shared = await getSharedCache(preset, latitude, longitude, fresh.parasha_date);

    if (!shared) {
        await saveSharedCache(preset, latitude, longitude, fresh);
        shared = await getSharedCache(preset, latitude, longitude, fresh.parasha_date);
    }

    const times = shared
        ? {
            parasha_date: shared.parasha_date,
            parasha_name: shared.parasha_name,
            candle_lighting_utc: shared.candle_lighting_utc,
            sunset_utc: shared.sunset_utc,
            shabbat_end_utc: shared.havdalah_utc,
        }
        : fresh;

    return upsertUserShabbosTimes(locationId, times);
}

async function seedPresetLocations() {
    for (const preset of PRESET_LOCATIONS) {
        await pool.query(
            `INSERT INTO preset_locations
                (label, city, state, country, latitude, longitude, timezone)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (label) DO NOTHING`,
            [
                preset.label,
                preset.city,
                preset.state,
                preset.country,
                preset.latitude,
                preset.longitude,
                preset.timezone,
            ]
        );
    }
}

async function fetchShabbatPreview(latitude, longitude, timezone) {
    const fresh = await fetchShabbatFromHebcal(latitude, longitude, timezone);
    return {
        parasha_date: fresh.parasha_date,
        parasha_name: fresh.parasha_name,
        candle_lighting_utc: fresh.candle_lighting_utc,
        sunset_utc: fresh.sunset_utc,
        candles_minutes_before_sunset: CANDLE_MINUTES_BEFORE_SUNSET,
    };
}

module.exports = {
    fetchAndCacheShabbatTimes,
    fetchShabbatPreview,
    fetchShabbatFromHebcal,
    seedPresetLocations,
    CANDLE_MINUTES_BEFORE_SUNSET,
};
