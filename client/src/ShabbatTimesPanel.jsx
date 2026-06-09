import { useEffect, useState } from 'react';
import LocationPicker from './LocationPicker';
import { getApiUrl, loadApiConfig } from './api';
import { QUICK_CITIES } from './presets';
import { formatParashaDate, formatTimeOnly } from './formatTime';
import './ShabbatTimesPanel.css';

const EMPTY_LOCATION = { location_lat: null, location_lng: null, location_label: '' };

function ShabbatTimesPanel({ initialLocation, showPicker = true, compact = false }) {
    const [location, setLocation] = useState(initialLocation || EMPTY_LOCATION);
    const [times, setTimes] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (initialLocation?.location_lat != null) {
            setLocation(initialLocation);
        }
    }, [initialLocation]);

    useEffect(() => {
        if (location.location_lat == null || location.location_lng == null) return undefined;

        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                await loadApiConfig();
                const params = new URLSearchParams({
                    lat: String(location.location_lat),
                    lng: String(location.location_lng),
                    label: location.location_label || '',
                });
                if (location.timezone) {
                    params.set('timezone', location.timezone);
                }
                const res = await fetch(`${getApiUrl()}/api/shabbat-preview?${params}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Could not load times');
                if (!cancelled) setTimes(data);
            } catch (err) {
                if (!cancelled) {
                    setTimes(null);
                    setError(err.message || 'Could not load Shabbat times');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [location.location_lat, location.location_lng, location.location_label, location.timezone]);

    const pickQuickCity = (city) => {
        setLocation({
            location_lat: city.location_lat,
            location_lng: city.location_lng,
            location_label: city.label,
            timezone: city.timezone,
        });
    };

    const onLocationChange = (next) => {
        setLocation((prev) => ({ ...prev, ...next }));
    };

    const tz = times?.timezone || location.timezone || 'UTC';
    const parashaLabel = times?.parasha_name?.replace(/^Parashat\s+/i, '') || null;

    const zmanRows = times
        ? [
              {
                  key: 'candles',
                  label: 'Candle lighting',
                  sub: `${times.candles_minutes_before_sunset || 18} min before sunset`,
                  value: formatTimeOnly(times.candle_lighting_utc, tz),
                  highlight: true,
              },
              {
                  key: 'sunset',
                  label: 'Shabbat begins',
                  sub: 'Sunset',
                  value: formatTimeOnly(times.sunset_utc, tz),
              },
              {
                  key: 'plag',
                  label: 'Plag haMincha',
                  sub: 'Earliest candle-lighting reference',
                  value: formatTimeOnly(times.plag_hamincha_utc, tz),
              },
              {
                  key: 'mincha',
                  label: 'Mincha ketana',
                  sub: 'Preferred latest Mincha',
                  value: formatTimeOnly(times.mincha_ketana_utc, tz),
              },
              {
                  key: 'havdalah',
                  label: 'Shabbat ends',
                  sub: 'Havdalah',
                  value: formatTimeOnly(times.havdalah_utc, tz),
              },
          ]
        : [];

    return (
        <section className={`shabbat-times-panel${compact ? ' shabbat-times-panel--compact' : ''}`}>
            {!compact && (
                <div className="shabbat-times-header">
                    <h2 className="shabbat-times-title">This week&apos;s zmanim</h2>
                    <p className="shabbat-times-sub">
                        Free for everyone — pick your city to see candle lighting, sunset, and havdalah
                        from Hebcal.
                    </p>
                </div>
            )}

            {showPicker && (
                <div className="shabbat-times-controls">
                    <div className="quick-cities" role="group" aria-label="Popular cities">
                        {QUICK_CITIES.map((city) => (
                            <button
                                key={city.label}
                                type="button"
                                className={
                                    location.location_label === city.label
                                        ? 'quick-city quick-city--active'
                                        : 'quick-city'
                                }
                                onClick={() => pickQuickCity(city)}
                            >
                                {city.short}
                            </button>
                        ))}
                    </div>
                    <LocationPicker
                        location={{
                            lat: location.location_lat,
                            lng: location.location_lng,
                            label: location.location_label,
                        }}
                        onChange={onLocationChange}
                    />
                </div>
            )}

            {loading && <p className="shabbat-times-status">Loading times…</p>}
            {error && !loading && <p className="shabbat-times-error">{error}</p>}

            {times && !loading && (
                <div className="shabbat-times-card">
                    <div className="shabbat-times-card-head">
                        <div>
                            <p className="shabbat-times-city">
                                {location.location_label?.split(',')[0] || 'Your city'}
                            </p>
                            <p className="shabbat-times-date">
                                {formatParashaDate(times.parasha_date, tz)}
                            </p>
                        </div>
                        {parashaLabel && (
                            <div className="shabbat-times-parasha">
                                <span className="parasha-label">Parasha</span>
                                <span className="parasha-name">{parashaLabel}</span>
                            </div>
                        )}
                    </div>

                    <ul className="zman-list">
                        {zmanRows.map((row) => (
                            <li
                                key={row.key}
                                className={row.highlight ? 'zman-item zman-item--highlight' : 'zman-item'}
                            >
                                <div className="zman-item-text">
                                    <span className="zman-label">{row.label}</span>
                                    <span className="zman-sub">{row.sub}</span>
                                </div>
                                <span className="zman-value">{row.value}</span>
                            </li>
                        ))}
                    </ul>

                    <p className="shabbat-times-foot">
                        Times from{' '}
                        <a
                            href="https://www.hebcal.com"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Hebcal
                        </a>
                        . Sign up to get SMS reminders before you light.
                    </p>
                </div>
            )}
        </section>
    );
}

export default ShabbatTimesPanel;
