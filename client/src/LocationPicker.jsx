import { useState, useEffect, useRef } from 'react';
import { searchPlaces, reverseGeocode } from './geocode';

function LocationPicker({ location, onChange }) {
    const [query, setQuery] = useState(location.label || '');
    const [suggestions, setSuggestions] = useState([]);
    const [open, setOpen] = useState(false);
    const [searching, setSearching] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [error, setError] = useState('');
    const wrapRef = useRef(null);

    const isValid = location.lat != null && location.lng != null && location.label;

    useEffect(() => {
        setQuery(location.label || '');
    }, [location.label]);

    useEffect(() => {
        const onDocClick = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    useEffect(() => {
        if (!open || query.trim().length < 2) {
            setSuggestions([]);
            return undefined;
        }

        const timer = setTimeout(async () => {
            setSearching(true);
            setError('');
            try {
                const results = await searchPlaces(query);
                setSuggestions(results);
                if (results.length === 0) {
                    setError('No matching places. Try "Austin, TX" or your city and state.');
                }
            } catch {
                setError('Could not search locations. Check your connection.');
            } finally {
                setSearching(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [query, open]);

    const selectPlace = (place) => {
        onChange({
            location_lat: place.lat,
            location_lng: place.lng,
            location_label: place.label,
        });
        setQuery(place.label);
        setOpen(false);
        setSuggestions([]);
        setError('');
    };

    const handleQueryChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        setError('');
        onChange({
            location_lat: null,
            location_lng: null,
            location_label: value,
        });
    };

    const runSearch = () => {
        if (query.trim().length < 2) {
            setError('Type at least 2 characters, then search.');
            return;
        }
        setOpen(true);
    };

    const handleGPS = () => {
        if (!navigator.geolocation) {
            setError('Your browser does not support location. Search for your city instead.');
            return;
        }

        setGpsLoading(true);
        setError('');
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const label = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
                    onChange({
                        location_lat: pos.coords.latitude,
                        location_lng: pos.coords.longitude,
                        location_label: label,
                    });
                    setQuery(label);
                    setOpen(false);
                } catch {
                    setError('Got GPS coordinates but could not resolve a place name. Search manually.');
                } finally {
                    setGpsLoading(false);
                }
            },
            () => {
                setGpsLoading(false);
                setError('Location blocked or unavailable. Search for your city (e.g. Austin, TX).');
            },
            { enableHighAccuracy: false, timeout: 12000 }
        );
    };

    return (
        <div className="location-picker" ref={wrapRef}>
            <p className="location-hint">
                We use your city for candle-lighting times. Traveling? You can update anytime under Manage alerts.
            </p>
            <div className="location-search-row">
                <div className="location-input-wrap">
                    <input
                        type="text"
                        name="location_label"
                        placeholder="City, State (e.g. Austin, TX)"
                        value={query}
                        onChange={handleQueryChange}
                        onFocus={() => query.trim().length >= 2 && setOpen(true)}
                        autoComplete="off"
                        aria-autocomplete="list"
                        aria-expanded={open}
                    />
                    <button
                        type="button"
                        className="btn-location-search"
                        onClick={runSearch}
                        aria-label="Search cities"
                        title="Search cities"
                    >
                        ▼
                    </button>
                    {open && (suggestions.length > 0 || searching) && (
                        <ul className="location-suggestions" role="listbox">
                            {searching && suggestions.length === 0 && (
                                <li className="location-suggestion muted">Searching…</li>
                            )}
                            {suggestions.map((place) => (
                                <li key={place.id} role="option">
                                    <button
                                        type="button"
                                        className="location-suggestion-btn"
                                        onClick={() => selectPlace(place)}
                                    >
                                        {place.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <button
                    type="button"
                    className="btn-gps"
                    onClick={handleGPS}
                    disabled={gpsLoading}
                >
                    {gpsLoading ? '…' : 'Detect'}
                </button>
            </div>
            {isValid && !error && (
                <p className="location-status valid">✓ {location.label}</p>
            )}
            {error && <p className="location-status error">{error}</p>}
            {!isValid && !error && query.trim().length > 0 && (
                <p className="location-status warn">Select a city from the list or use Detect.</p>
            )}
        </div>
    );
}

export default LocationPicker;
