import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AlertPreferences.css';
import './SignupForm.css';
import API_URL from './api';
import LocationPicker from './LocationPicker';

function AlertPreferences() {
    const navigate = useNavigate();
    const [step, setStep] = useState('phone');
    const [phone, setPhone] = useState('');
    const [userId, setUserId] = useState(null);
    const [prefs, setPrefs] = useState({
        zmanim_opinion: 'gra',
        alert_preferences: [18],
        location_lat: null,
        location_lng: null,
        location_label: ''
    });
    const [loading, setLoading] = useState(false);

    const handleLookup = async () => {
        if (!phone.trim()) {
            alert('Please enter your phone number.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/manage/lookup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: phone.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setUserId(data.userId);
                setPrefs({
                    zmanim_opinion: data.zmanim_opinion || 'gra',
                    alert_preferences: data.alert_preferences || [18],
                    location_lat: data.location_lat,
                    location_lng: data.location_lng,
                    location_label: data.location_label || ''
                });
                setStep('preferences');
            } else {
                alert(data.error || 'Account not found.');
            }
        } catch {
            alert('Could not connect to server.');
        }
        setLoading(false);
    };

    const handleLocationChange = (loc) => {
        setPrefs((prev) => ({ ...prev, ...loc }));
    };

    const handleSavePrefs = async () => {
        if (!prefs.location_lat || !prefs.location_lng) {
            alert('Please select a real city from the search list or use Detect.');
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
            if (data.success) {
                alert('Preferences saved! Your next Shabbat texts will use this location.');
            } else {
                alert('Error: ' + data.error);
            }
        } catch {
            alert('Could not connect to server.');
        }
        setLoading(false);
    };

    return (
        <div className="page-wrapper">
            <button type="button" className="btn-back" onClick={() => navigate('/')}>
                ← Back to home
            </button>
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
                        <h2>Find your account</h2>
                        <p className="card-subtitle">Enter the phone number you signed up with</p>
                        <div className="form-group">
                            <label>Phone number</label>
                            <input
                                type="tel"
                                placeholder="+1 (212) 555-0100"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>
                        <div className="divider" />
                        <button
                            type="button"
                            className="btn-submit"
                            onClick={handleLookup}
                            disabled={loading}
                        >
                            {loading ? 'Looking up…' : 'Continue'}
                        </button>
                    </>
                )}

                {step === 'preferences' && (
                    <>
                        <h2>Your preferences</h2>
                        <p className="card-subtitle">
                            Update your city when traveling — Friday texts will use this location
                        </p>

                        <div className="form-group">
                            <label>Zmanim opinion</label>
                            <div className="select-wrapper">
                                <select
                                    value={prefs.zmanim_opinion}
                                    onChange={(e) => setPrefs({ ...prefs, zmanim_opinion: e.target.value })}
                                >
                                    <option value="gra">Gra (Vilna Gaon)</option>
                                    <option value="ma">Magen Avraham</option>
                                    <option value="rt">Rabbeinu Tam</option>
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
                                                updated[index] = parseInt(e.target.value, 10);
                                                setPrefs({ ...prefs, alert_preferences: updated });
                                            }}
                                        />
                                        <span className="unit-label">minutes before</span>
                                        {prefs.alert_preferences.length > 1 && (
                                            <button
                                                type="button"
                                                className="link remove"
                                                onClick={() => {
                                                    const updated = prefs.alert_preferences.filter((_, i) => i !== index);
                                                    setPrefs({ ...prefs, alert_preferences: updated });
                                                }}
                                            >
                                                remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {prefs.alert_preferences.length < 3 && (
                                    <button
                                        type="button"
                                        className="btn-add-alert"
                                        onClick={() =>
                                            setPrefs({ ...prefs, alert_preferences: [...prefs.alert_preferences, 18] })
                                        }
                                    >
                                        + Add another alert
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Location</label>
                            <LocationPicker
                                location={{
                                    lat: prefs.location_lat,
                                    lng: prefs.location_lng,
                                    label: prefs.location_label,
                                }}
                                onChange={handleLocationChange}
                            />
                        </div>

                        <div className="divider" />
                        <button
                            type="button"
                            className="btn-submit"
                            onClick={handleSavePrefs}
                            disabled={loading}
                        >
                            {loading ? 'Saving…' : 'Save preferences'}
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
