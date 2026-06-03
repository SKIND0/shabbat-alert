import { useState } from 'react';
import './AlertPreferences.css';
import API_URL from './api';

function AlertPreferences() {
    const [step, setStep] = useState('phone');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [userId, setUserId] = useState(null);
    const [prefs, setPrefs] = useState({
        zmanim_opinion: 'gra',
        alert_preferences: [18],
        location_lat: null,
        location_lng: null,
        location_label: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSendCode = async () => {
        if (!phone) { alert('Please enter your phone number.'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/verify/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: phone })
            });
            const data = await res.json();
            if (data.success) setStep('code');
            else alert('Error: ' + data.error);
        } catch {
            alert('Could not connect to server.');
        }
        setLoading(false);
    };

    const handleVerifyCode = async () => {
        if (!code) { alert('Please enter the code.'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/verify/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: phone, code })
            });
            const data = await res.json();
            if (data.success) {
                setUserId(data.userId);
                setPrefs({
                    zmanim_opinion: data.zmanim_opinion || 'gra',
                    alert_preferences: data.alert_preferences || [18],
                    location_lat: data.location_lat || null,
                    location_lng: data.location_lng || null,
                    location_label: data.location_label || ''
                });
                setStep('preferences');
            } else alert('Invalid or expired code.');
        } catch {
            alert('Could not connect to server.');
        }
        setLoading(false);
    };

    const handleGPS = () => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setPrefs({
                    ...prefs,
                    location_lat: pos.coords.latitude,
                    location_lng: pos.coords.longitude,
                    location_label: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
                });
            },
            () => alert('Could not get location. Please enter it manually.')
        );
    };

    const geocodeLocation = async (label) => {
        if (!label) return;
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(label)}&format=json&limit=1`
            );
            const data = await res.json();
            if (data.length > 0) {
                setPrefs(prev => ({
                    ...prev,
                    location_lat: parseFloat(data[0].lat),
                    location_lng: parseFloat(data[0].lon),
                    location_label: label
                }));
            } else alert('Location not found. Try a different city name.');
        } catch {
            alert('Could not look up location.');
        }
    };

    const handleSavePrefs = async () => {
        if (!prefs.location_lat || !prefs.location_lng) {
            alert('Please enter a location or use Detect.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/preferences/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(prefs)
            });
            const data = await res.json();
            if (data.success) alert('Preferences saved! 🕯️');
            else alert('Error: ' + data.error);
        } catch {
            alert('Could not connect to server.');
        }
        setLoading(false);
    };

    return (
        <div className="page-wrapper">
            <div className="brand-header">
                <h1>Shabbat Alert</h1>
                <div className="candle-divider">
                    <div className="line"></div>
                    <div className="dot"></div>
                    <div className="line right"></div>
                </div>
                <p className="tagline">Manage your preferences</p>
            </div>

            <div className="signup-card">

                {step === 'phone' && (
                    <>
                        <h2>Verify your number</h2>
                        <p className="card-subtitle">We'll send a 6-digit code to your phone</p>
                        <div className="form-group">
                            <label>Phone number</label>
                            <input
                                placeholder="+1 (212) 555-0100"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>
                        <div className="divider" />
                        <button className="btn-submit" onClick={handleSendCode} disabled={loading}>
                            {loading ? 'Sending...' : 'Send code'}
                        </button>
                    </>
                )}

                {step === 'code' && (
                    <>
                        <h2>Enter your code</h2>
                        <p className="card-subtitle">
                            Sent to {phone} · <span className="link" onClick={() => setStep('phone')}>wrong number?</span>
                        </p>
                        <div className="form-group">
                            <label>6-digit code</label>
                            <input
                                placeholder="123456"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                maxLength={6}
                            />
                        </div>
                        <div className="divider" />
                        <button className="btn-submit" onClick={handleVerifyCode} disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify'}
                        </button>
                    </>
                )}

                {step === 'preferences' && (
                    <>
                        <h2>Your preferences</h2>
                        <p className="card-subtitle">Changes apply to all future alerts</p>

                        <div className="form-group">
                            <label>Zmanim opinion</label>
                            <div className="select-wrapper">
                                <select
                                    value={prefs.zmanim_opinion}
                                    onChange={(e) => setPrefs({ ...prefs, zmanim_opinion: e.target.value })}
                                >
                                    <option value="gra">Gra</option>
                                    <option value="baalhatanya">Baal HaTanya</option>
                                    <option value="MGA">Magen Avraham</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Alert timing</label>
                            <div className="alert-inputs">
                                {prefs.alert_preferences.map((alert, index) => (
                                    <div className="alert-row" key={index}>
                                        <input
                                            type="number"
                                            value={alert}
                                            onChange={(e) => {
                                                const updated = [...prefs.alert_preferences];
                                                updated[index] = parseInt(e.target.value);
                                                setPrefs({ ...prefs, alert_preferences: updated });
                                            }}
                                        />
                                        <span className="unit-label">minutes before</span>
                                        {prefs.alert_preferences.length > 1 && (
                                            <span className="link remove" onClick={() => {
                                                const updated = prefs.alert_preferences.filter((_, i) => i !== index);
                                                setPrefs({ ...prefs, alert_preferences: updated });
                                            }}>remove</span>
                                        )}
                                    </div>
                                ))}
                                {prefs.alert_preferences.length < 3 && (
                                    <button className="btn-add-alert" onClick={() =>
                                        setPrefs({ ...prefs, alert_preferences: [...prefs.alert_preferences, 18] })
                                    }>
                                        + Add another alert
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Location</label>
                            <div className="location-row">
                                <input
                                    placeholder="Brooklyn, NY"
                                    value={prefs.location_label}
                                    onChange={(e) => setPrefs({ ...prefs, location_label: e.target.value })}
                                    onBlur={(e) => geocodeLocation(e.target.value)}
                                />
                                <button className="btn-gps" onClick={handleGPS}>
                                    Detect
                                </button>
                            </div>
                        </div>

                        <div className="divider" />
                        <button className="btn-submit" onClick={handleSavePrefs} disabled={loading}>
                            {loading ? 'Saving...' : 'Save preferences'}
                        </button>
                    </>
                )}

            </div>

            <p className="footer-note">
                Reply STOP to any text to unsubscribe at any time
            </p>
        </div>
    );
}

export default AlertPreferences;
