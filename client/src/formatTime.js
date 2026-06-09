export function formatLocalTime(utcValue, timezone) {
    if (!utcValue) return '—';
    return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone || 'UTC',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(new Date(utcValue));
}

export function formatTimeOnly(utcValue, timezone) {
    if (!utcValue) return '—';
    return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone || 'UTC',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(new Date(utcValue));
}

export function formatParashaDate(dateStr, timezone) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const utc = new Date(Date.UTC(y, m - 1, d, 12));
    return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone || 'UTC',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    }).format(utc);
}
