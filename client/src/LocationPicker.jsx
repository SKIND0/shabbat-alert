import { useState, useEffect, useRef } from 'react';
import { searchPlaces, reverseGeocode } from './geocode';

function LocationPicker({ location, onChange }) {
    const [query, setQuery] = useState(location.label || '');
    const [suggestions, setSuggestions] = useState([]);
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
                setSuggestions([]);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    useEffect(() => {
        if (query.trim().length < 2) {
            setSuggestions([]);
            return undefined;
        }

        const timer = setTimeout(async () => {
            setSearching(true);
            setError('');
            try {
                const results = await searchPlaces(query);
                setSuggestions(results);
            } catch {
                setError('Could not search locations. Check your connection.');
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const selectPlace = (place) => {
        onChange({
            location_lat: place.lat,
            location_lng: place.lng,
            location_label: place.label,
        });
        setQuery(place.label);
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
                    setSuggestions([]);
                } catch {
                    setError('Could not resolve your city. Please search and pick from the list.');
                } finally {
                    setGpsLoading(false);
                }
            },
            () => {
                setGpsLoading(false);
                setError('Location blocked or unavailable. Search for your city (e.g. Brooklyn, New York).');
            },
            { enableHighAccuracy: false, timeout: 12000 }
        );
    };

    const showSuggestions = query.trim().length >= 2 && (searching || suggestions.length > 0);

    return (
        <div className="location-picker" ref={wrapRef}>
            <p className="location-hint">
                City and state only — pick from the list or use Detect.
            </p>
            <div className="location-search-row">
                <div className="location-input-wrap">
                    <input
                        type="text"
                        name="location_label"
                        placeholder="Start typing your city…"
                        value={query}
                        onChange={handleQueryChange}
                        autoComplete="off"
                    />
                    {showSuggestions && (
                        <ul className="location-suggestions">
                            {searching && suggestions.length === 0 && (
                                <li className="location-suggestion muted">Searching…</li>
                            )}
                            {suggestions.map((place) => (
                                <li key={place.id}>
                                    <button
                                        type="button"
                                        className="location-suggestion-btn"
                                        onClick={() => selectPlace(place)}
                                    >
                                        {place.label}
                                    </button>
                                </li>
                            ))}
                            {!searching && suggestions.length === 0 && (
                                <li className="location-suggestion muted">
                                    No cities found. Try &quot;Brooklyn, New York&quot;.
                                </li>
                            )}
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
                <p className="location-status warn">Pick a city from the list or use Detect.</p>
            )}
        </div>
    );
}

export default LocationPicker;
