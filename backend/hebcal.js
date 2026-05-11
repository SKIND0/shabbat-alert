const fetch = require('node-fetch');
const pool = require('./db');

async function fetchAndCacheShabbatTimes(locationId, latitude, longitude, timezone) {
    // Check cache first
    const cached = await pool.query(
        `SELECT * FROM shabbos_times 
     WHERE location_id = $1 
     AND parasha_date >= CURRENT_DATE 
     ORDER BY parasha_date ASC 
     LIMIT 1`,
        [locationId]
    );

    if (cached.rows.length > 0) {
        console.log('Returning cached Shabbat times');
        return cached.rows[0];
    }

    // Fetch from Hebcal
    const url = `https://www.hebcal.com/shabbat?cfg=json&latitude=${latitude}&longitude=${longitude}&tzid=${timezone}&M=on`;
    const response = await fetch(url);
    const data = await response.json();

    // Parse out what we need
    const candles = data.items.find(i => i.category === 'candles');
    const havdalah = data.items.find(i => i.category === 'havdalah');
    const parasha = data.items.find(i => i.category === 'parashat');

    if (!candles || !havdalah) {
        throw new Error('Could not find candle lighting or havdalah times');
    }

    const parashaDate = candles.date.split('T')[0]; // just the date part e.g. 2026-05-15

    // Save to cache
    const result = await pool.query(
        `INSERT INTO shabbos_times 
      (location_id, parasha_date, parasha_name, candle_lighting_utc, havdalah_utc)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (location_id, parasha_date) DO UPDATE
       SET candle_lighting_utc = EXCLUDED.candle_lighting_utc,
           havdalah_utc = EXCLUDED.havdalah_utc
     RETURNING *`,
        [
            locationId,
            parashaDate,
            parasha ? parasha.title : null,
            candles.date,
            havdalah.date
        ]
    );

    return result.rows[0];
}

module.exports = { fetchAndCacheShabbatTimes };