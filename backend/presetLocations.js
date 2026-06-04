/** Popular cities — shared Hebcal cache targets (US + Israel). */
const PRESET_LOCATIONS = [
    { city: 'Brooklyn', state: 'New York', country: 'United States', label: 'Brooklyn, New York, United States', latitude: 40.6782, longitude: -73.9442, timezone: 'America/New_York' },
    { city: 'New York', state: 'New York', country: 'United States', label: 'New York, New York, United States', latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York' },
    { city: 'Los Angeles', state: 'California', country: 'United States', label: 'Los Angeles, California, United States', latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles' },
    { city: 'Chicago', state: 'Illinois', country: 'United States', label: 'Chicago, Illinois, United States', latitude: 41.8781, longitude: -87.6298, timezone: 'America/Chicago' },
    { city: 'Miami', state: 'Florida', country: 'United States', label: 'Miami, Florida, United States', latitude: 25.7617, longitude: -80.1918, timezone: 'America/New_York' },
    { city: 'Boston', state: 'Massachusetts', country: 'United States', label: 'Boston, Massachusetts, United States', latitude: 42.3601, longitude: -71.0589, timezone: 'America/New_York' },
    { city: 'Baltimore', state: 'Maryland', country: 'United States', label: 'Baltimore, Maryland, United States', latitude: 39.2904, longitude: -76.6122, timezone: 'America/New_York' },
    { city: 'Cleveland', state: 'Ohio', country: 'United States', label: 'Cleveland, Ohio, United States', latitude: 41.4993, longitude: -81.6944, timezone: 'America/New_York' },
    { city: 'Lakewood', state: 'New Jersey', country: 'United States', label: 'Lakewood, New Jersey, United States', latitude: 40.0976, longitude: -74.2176, timezone: 'America/New_York' },
    { city: 'Monsey', state: 'New York', country: 'United States', label: 'Monsey, New York, United States', latitude: 41.1112, longitude: -74.0685, timezone: 'America/New_York' },
    { city: 'Teaneck', state: 'New Jersey', country: 'United States', label: 'Teaneck, New Jersey, United States', latitude: 40.8976, longitude: -74.0159, timezone: 'America/New_York' },
    { city: 'Jerusalem', state: null, country: 'Israel', label: 'Jerusalem, Israel', latitude: 31.7683, longitude: 35.2137, timezone: 'Asia/Jerusalem' },
    { city: 'Tel Aviv', state: null, country: 'Israel', label: 'Tel Aviv, Israel', latitude: 32.0853, longitude: 34.7818, timezone: 'Asia/Jerusalem' },
    { city: 'Bnei Brak', state: null, country: 'Israel', label: 'Bnei Brak, Israel', latitude: 32.0809, longitude: 34.8338, timezone: 'Asia/Jerusalem' },
    { city: 'Beit Shemesh', state: null, country: 'Israel', label: 'Beit Shemesh, Israel', latitude: 31.7511, longitude: 34.9881, timezone: 'Asia/Jerusalem' },
    { city: 'Haifa', state: null, country: 'Israel', label: 'Haifa, Israel', latitude: 32.7940, longitude: 34.9896, timezone: 'Asia/Jerusalem' },
];

function normalizeKey(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const r = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findPreset(latitude, longitude, label) {
    const normalizedLabel = normalizeKey(label);
    if (normalizedLabel) {
        const labelMatch = PRESET_LOCATIONS.find((p) => {
            const presetKey = normalizeKey(p.label);
            return (
                normalizedLabel === presetKey ||
                normalizedLabel.startsWith(presetKey) ||
                presetKey.startsWith(normalizedLabel)
            );
        });
        if (labelMatch) return labelMatch;
    }

    let best = null;
    let bestDist = Infinity;
    for (const preset of PRESET_LOCATIONS) {
        const dist = haversineKm(latitude, longitude, preset.latitude, preset.longitude);
        if (dist < bestDist) {
            bestDist = dist;
            best = preset;
        }
    }
    return bestDist <= 25 ? best : null;
}

function roundCoord(value) {
    return Math.round(Number(value) * 100) / 100;
}

module.exports = {
    PRESET_LOCATIONS,
    findPreset,
    roundCoord,
    normalizeKey,
};
