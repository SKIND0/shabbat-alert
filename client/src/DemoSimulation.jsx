import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiUrl, loadApiConfig } from './api';
import { formatLocalTime, formatTimeOnly } from './formatTime';
import { DEFAULT_CITY } from './presets';
// adding a comment to recommit
const DEMO_CITIES = [
    DEFAULT_CITY,
    {
        short: 'Jerusalem',
        label: 'Jerusalem, Israel',
        location_lat: 31.7683,
        location_lng: 35.2137,
        timezone: 'Asia/Jerusalem',
    },
    {
        short: 'Los Angeles',
        label: 'Los Angeles, California, United States',
        location_lat: 34.0522,
        location_lng: -118.2437,
        timezone: 'America/Los_Angeles',
    },
    {
        short: 'Teaneck',
        label: 'Teaneck, New Jersey, United States',
        location_lat: 40.8976,
        location_lng: -74.0159,
        timezone: 'America/New_York',
    },
];

const ALERT_OPTIONS = [18, 30, 60, 120];

function formatEventTime(iso, timezone) {
    return formatLocalTime(iso, timezone);
}

function DemoSimulation() {
    const [name, setName] = useState('Sarah');
    const [city, setCity] = useState(DEMO_CITIES[0]);
    const [selectedMinutes, setSelectedMinutes] = useState([18, 60]);
    const [timeline, setTimeline] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const playRef = useRef(null);

    const loadTimeline = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            await loadApiConfig();
            const params = new URLSearchParams({
                name: name.trim() || 'Sarah',
                lat: String(city.location_lat),
                lng: String(city.location_lng),
                location_label: city.label,
                minutes: selectedMinutes.join(','),
            });
            if (city.timezone) {
                params.set('timezone', city.timezone);
            }
            const res = await fetch(`${getApiUrl()}/api/demo/timeline?${params}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not load simulation');
            setTimeline(data);
            setActiveIndex(-1);
            setIsPlaying(false);
        } catch (err) {
            setTimeline(null);
            setError(err.message || 'Could not load simulation');
        } finally {
            setLoading(false);
        }
    }, [name, city, selectedMinutes]);

    useEffect(() => {
        loadTimeline();
    }, [loadTimeline]);

    useEffect(() => {
        if (!isPlaying || !timeline?.events?.length) return undefined;

        if (activeIndex < 0) {
            setActiveIndex(0);
            return undefined;
        }

        if (activeIndex >= timeline.events.length - 1) {
            setIsPlaying(false);
            return undefined;
        }

        playRef.current = window.setTimeout(() => {
            setActiveIndex((i) => i + 1);
        }, 2200);

        return () => {
            if (playRef.current) window.clearTimeout(playRef.current);
        };
    }, [isPlaying, activeIndex, timeline]);

    const visibleSms = timeline?.events
        ?.slice(0, activeIndex + 1)
        .filter((e) => e.kind === 'sms') || [];

    const toggleMinute = (minute) => {
        setSelectedMinutes((prev) => {
            if (prev.includes(minute)) {
                const next = prev.filter((m) => m !== minute);
                return next.length ? next : [minute];
            }
            if (prev.length >= 3) return prev;
            return [...prev, minute].sort((a, b) => a - b);
        });
    };

    const onPlay = () => {
        setActiveIndex(-1);
        setIsPlaying(true);
    };

    const onReset = () => {
        setIsPlaying(false);
        setActiveIndex(-1);
    };

    const tz = timeline?.timezone || city.timezone || 'UTC';
    const candleLabel = timeline?.candle_lighting_utc
        ? formatTimeOnly(timeline.candle_lighting_utc, tz)
        : null;

    return (
        <div className="sim-layout">
            <div className="sim-controls">
                <p className="demo-section-lead sim-lead">
                    Walk through signup → welcome text → Friday replan → candle-lighting reminders.
                    Messages use the same templates as production.
                </p>

                <div className="sim-form">
                    <label className="sim-field">
                        <span className="sim-label">First name</span>
                        <input
                            type="text"
                            className="sim-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={40}
                        />
                    </label>

                    <label className="sim-field">
                        <span className="sim-label">City</span>
                        <select
                            className="sim-input"
                            value={city.label}
                            onChange={(e) => {
                                const next = DEMO_CITIES.find((c) => c.label === e.target.value);
                                if (next) setCity(next);
                            }}
                        >
                            {DEMO_CITIES.map((c) => (
                                <option key={c.label} value={c.label}>
                                    {c.short}
                                </option>
                            ))}
                        </select>
                    </label>

                    <fieldset className="sim-field sim-alerts">
                        <legend className="sim-label">Remind me before candles (up to 3)</legend>
                        <div className="sim-alert-chips">
                            {ALERT_OPTIONS.map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    className={
                                        selectedMinutes.includes(m)
                                            ? 'sim-chip sim-chip--on'
                                            : 'sim-chip'
                                    }
                                    onClick={() => toggleMinute(m)}
                                >
                                    {m} min
                                </button>
                            ))}
                        </div>
                    </fieldset>
                </div>

                {timeline && !error && (
                    <p className="sim-times-note">
                        This week in {city.short}: candles at {candleLabel}
                        {timeline.parasha_name ? ` · ${timeline.parasha_name.replace(/^Parashat\s+/i, '')}` : ''}
                    </p>
                )}

                <div className="sim-actions">
                    <button
                        type="button"
                        className="btn-submit sim-btn"
                        onClick={onPlay}
                        disabled={loading || isPlaying || !!error}
                    >
                        {isPlaying ? 'Playing…' : 'Play simulation'}
                    </button>
                    <button
                        type="button"
                        className="btn-manage sim-btn"
                        onClick={onReset}
                        disabled={activeIndex < 0 && !isPlaying}
                    >
                        Reset
                    </button>
                </div>
            </div>

            <div className="sim-stage">
                <div className="sim-timeline-col">
                    <h3 className="sim-col-title">Timeline</h3>
                    {loading && <p className="sim-status">Loading times…</p>}
                    {error && <p className="sim-error">{error}</p>}
                    {!loading && !error && timeline?.events && (
                        <ol className="sim-timeline">
                            {timeline.events.map((event, index) => {
                                const isActive = index === activeIndex;
                                const isPast = index < activeIndex;
                                const isFuture = index > activeIndex;
                                return (
                                    <li key={event.id}>
                                        <button
                                            type="button"
                                            className={[
                                                'sim-timeline-event',
                                                isActive ? 'sim-timeline-event--active' : '',
                                                isPast ? 'sim-timeline-event--past' : '',
                                                isFuture ? 'sim-timeline-event--future' : '',
                                                `sim-timeline-event--${event.kind}`,
                                            ]
                                                .filter(Boolean)
                                                .join(' ')}
                                            onClick={() => {
                                                setIsPlaying(false);
                                                setActiveIndex(index);
                                            }}
                                        >
                                            <span className="sim-event-time">
                                                {formatEventTime(event.at, tz)}
                                            </span>
                                            <span className="sim-event-label">{event.label}</span>
                                            {event.detail && (
                                                <span className="sim-event-detail">{event.detail}</span>
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </div>

                <div className="sim-phone-col">
                    <h3 className="sim-col-title">Messages</h3>
                    <div className="sim-phone" aria-label="Simulated phone messages">
                        <div className="sim-phone-notch" aria-hidden="true" />
                        <div className="sim-phone-header">
                            <span className="sim-phone-sender">Shabbat Alert</span>
                        </div>
                        <div className="sim-phone-body">
                            {activeIndex < 0 && !loading && (
                                <p className="sim-phone-hint">
                                    Press Play to see texts arrive in order.
                                </p>
                            )}
                            {visibleSms.map((event) => (
                                <div key={event.id} className="sim-bubble-wrap">
                                    <time className="sim-bubble-time" dateTime={event.at}>
                                        {formatEventTime(event.at, tz)}
                                    </time>
                                    <div className="sim-bubble">{event.message}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DemoSimulation;
