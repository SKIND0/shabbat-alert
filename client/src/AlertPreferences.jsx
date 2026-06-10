import { useState } from 'react';
import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';
import './SignupForm.css';
import { loadApiConfig, getApiUrl } from './api';
import LocationPicker from './LocationPicker';

function AlertPreferences() {
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
    const [saved, setSaved] = useState(false);

    const handleLookup = async () => {
        if (!phone.trim()) {
            alert('Please enter your phone number.');
            return;
        }
        setLoading(true);
        setSaved(false);
        try {
            await loadApiConfig();
            const res = await fetch(`${getApiUrl()}/api/manage/lookup`, {
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
        setSaved(false);
    };

    const handleSavePrefs = async () => {
        if (!prefs.location_lat || !prefs.location_lng) {
            alert('Please select a real city from the search list or use Detect.');
            return;
        }
        setLoading(true);
        setSaved(false);
        try {
            await loadApiConfig();
            const res = await fetch(`${getApiUrl()}/api/preferences/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(prefs)
            });
            const data = await res.json();
            if (data.success) {
                setSaved(true);
            } else {
                alert('Error: ' + data.error);
            }
        } catch {
            alert('Could not connect to server.');
        }
        setLoading(false);
    };

    return (
        <div className="site-page">
            <div className="site-inner signup-page">
                <SiteNav />
                <div className="brand-header">
                    <h1>Manage</h1>
                    <div className="candle-divider">
                        <div className="line"></div>
                        <div className="dot"></div>
                        <div className="line right"></div>
                    </div>
                    <p className="tagline">Manage your preferences</p>
                </div>

                <div className="form-panel">
                    {step === 'phone' && (
                        <>
                            <h2>Find your account</h2>
                            <p className="card-subtitle">Enter the phone number you signed up with</p>
                            <div className="form-group">
                                <label htmlFor="lookup_phone">Phone number</label>
                                <input
                                    id="lookup_phone"
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

                            {saved && (
                                <div className="save-success" role="status">
                                    Preferences saved! You should get a confirmation text shortly.
                                    Your next Shabbat reminders will use these settings.
                                </div>
                            )}

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

                            <div className="form-group">
                                <label>When to text you</label>
                                <div className="hebcal-note">
                                    <p>
                                        Times from{' '}
                                        <a href="https://www.hebcal.com" target="_blank" rel="noopener noreferrer">
                                            Hebcal
                                        </a>{' '}
                                        for your city. Shabbat begins at candle lighting — often about{' '}
                                        <strong>18 minutes before sunset</strong>.
                                    </p>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Alert timing</label>
                                <div className="alert-inputs">
                                    {prefs.alert_preferences.map((alert, index) => (
                                        <div className="alert-row" key={index}>
                                            <input
                                                type="number"
                                                min="1"
                                                max="720"
                                                value={alert}
                                                onChange={(e) => {
                                                    const updated = [...prefs.alert_preferences];
                                                    updated[index] = parseInt(e.target.value, 10);
                                                    setPrefs({ ...prefs, alert_preferences: updated });
                                                    setSaved(false);
                                                }}
                                            />
                                            <span className="unit-label">minutes before candle lighting</span>
                                            {prefs.alert_preferences.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="link remove"
                                                    onClick={() => {
                                                        const updated = prefs.alert_preferences.filter((_, i) => i !== index);
                                                        setPrefs({ ...prefs, alert_preferences: updated });
                                                        setSaved(false);
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
                                            onClick={() => {
                                                setPrefs({
                                                    ...prefs,
                                                    alert_preferences: [...prefs.alert_preferences, 18]
                                                });
                                                setSaved(false);
                                            }}
                                        >
                                            + Add another alert
                                        </button>
                                    )}
                                </div>
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

                <SiteFooter />
            </div>
        </div>
    );
}

export default AlertPreferences;
