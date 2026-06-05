const MIN_ALERT_MINUTES = 1;
const MAX_ALERT_MINUTES = 720; // 12 hours before candles — allows a Friday-morning text

function sanitizeAlertMinutes(raw) {
    const list = (Array.isArray(raw) ? raw : [raw])
        .slice(0, 3)
        .map((m) => parseInt(m, 10))
        .filter((m) => !Number.isNaN(m) && m >= MIN_ALERT_MINUTES && m <= MAX_ALERT_MINUTES);

    return list.length ? [...new Set(list)] : [18];
}

module.exports = {
    MIN_ALERT_MINUTES,
    MAX_ALERT_MINUTES,
    sanitizeAlertMinutes,
};
