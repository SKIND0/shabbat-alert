import { useEffect, useState } from 'react';
import LocationPicker from './LocationPicker';
import { getApiUrl, loadApiConfig } from './api';
import { formatParashaDate, formatTimeOnly } from './formatTime';
import './ShabbatTimesPanel.css';

const EMPTY_LOCATION = { location_lat: null, location_lng: null, location_label: '' };

function TimesSkeleton() {
    return (
        <div className="times-panel-inner times-panel-inner--loading" aria-hidden="true">
            <div className="times-skeleton-head" />
            <div className="times-tiles">
                <div className="times-skeleton-tile" />
                <div className="times-skeleton-tile" />
            </div>
        </div>
    );
}

function ShabbatTimesPanel({ initialLocation }) {
    const [location, setLocation] = useState(initialLocation || EMPTY_LOCATION);
    const [times, setTimes] = useState(null);
    const [loading, setLoading] = useState(Boolean(initialLocation?.location_lat));
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
                });
                if (location.location_label) {
                    params.set('label', location.location_label);
                }
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

    const onLocationChange = (next) => {
        setLocation((prev) => ({ ...prev, ...next }));
    };

    const tz = times?.timezone || location.timezone || 'UTC';
    const parashaLabel = times?.parasha_name?.replace(/^Parashat\s+/i, '') || null;
    const cityName = location.location_label?.split(',')[0] || 'Your city';
    const candleMinutes = times?.candles_minutes_before_sunset || 18;
    const showTiles = times && !error;

    return (
        <section className="times-panel" aria-live="polite">
            {loading && !showTiles && <TimesSkeleton />}

            {error && !loading && (
                <p className="times-error">{error}</p>
            )}

            {showTiles && (
                <div className={`times-panel-inner${loading ? ' times-panel-inner--refresh' : ''}`}>
                    <div className="times-panel-head">
                        <div className="times-panel-meta">
                            <p className="times-city">{cityName}</p>
                            <p className="times-date">{formatParashaDate(times.parasha_date, tz)}</p>
                        </div>
                        {parashaLabel && (
                            <div className="times-parasha">
                                <span className="times-parasha-label">Parasha</span>
                                <span className="times-parasha-name">{parashaLabel}</span>
                            </div>
                        )}
                    </div>

                    <div className="times-tiles">
                        <article className="times-tile times-tile--primary">
                            <span className="times-tile-icon" aria-hidden="true">🕯️</span>
                            <span className="times-tile-time">
                                {formatTimeOnly(times.candle_lighting_utc, tz)}
                            </span>
                            <span className="times-tile-label">Candle lighting</span>
                            <span className="times-tile-sub">{candleMinutes} min before sunset</span>
                        </article>
                        <article className="times-tile">
                            <span className="times-tile-icon" aria-hidden="true">🌅</span>
                            <span className="times-tile-time">
                                {formatTimeOnly(times.sunset_utc, tz)}
                            </span>
                            <span className="times-tile-label">Shabbat begins</span>
                            <span className="times-tile-sub">Sunset</span>
                        </article>
                    </div>

                    {loading && <p className="times-refresh">Updating…</p>}
                </div>
            )}

            <div className="times-search-block">
                <label className="times-search-label" htmlFor="times-city-search">
                    Change city
                </label>
                <LocationPicker
                    id="times-city-search"
                    location={{
                        lat: location.location_lat,
                        lng: location.location_lng,
                        label: location.location_label,
                    }}
                    onChange={onLocationChange}
                    showDetect={false}
                    quiet
                />
            </div>

            <p className="times-credit">
                Times from{' '}
                <a href="https://www.hebcal.com" target="_blank" rel="noopener noreferrer">
                    Hebcal
                </a>
            </p>
        </section>
    );
}

export default ShabbatTimesPanel;
