import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './SignupForm.css';
import { loadApiConfig, getApiUrl } from './api';
import LocationPicker from './LocationPicker';

const MAX_ALERT_MINUTES = 720;

function SignupForm() {
    const [formData, setFormData] = useState({
        first_name: '',
        phone_number: '',
        location_lat: null,
        location_lng: null,
        location_label: '',
        zmanim_opinion: 'gra',
        alert_preferences: [18]
    });
    const [consented, setConsented] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [duplicatePhone, setDuplicatePhone] = useState(false);
    const [apiReady, setApiReady] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        loadApiConfig().finally(() => setApiReady(true));
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLocationChange = (loc) => {
        setFormData((prev) => ({ ...prev, ...loc }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        if (!consented) {
            alert('Please agree to receive SMS alerts.');
            return;
        }
        if (!formData.first_name?.trim() || !formData.phone_number?.trim()) {
            alert('Please enter your name and phone number.');
            return;
        }
        if (!formData.location_lat || !formData.location_lng) {
            alert('Please select a real city from the search list or use Detect.');
            return;
        }

        setSubmitting(true);
        setDuplicatePhone(false);
        try {
            await loadApiConfig();
            const res = await fetch(`${getApiUrl()}/api/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                const hint = text.includes('<!DOCTYPE')
                    ? 'Got HTML instead of JSON.'
                    : text.slice(0, 100);
                alert(`Server error (${res.status}). ${hint}\nAPI: ${getApiUrl()}`);
                return;
            }
            if (!res.ok) {
                alert(`${data.error || 'Request failed'} (${res.status})\nAPI: ${getApiUrl()}`);
                return;
            }
            if (data.success) {
                navigate('/signup/success', {
                    replace: true,
                    state: { name: formData.first_name },
                });
            } else if (res.status === 409 || data.code === 'PHONE_EXISTS') {
                setDuplicatePhone(true);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            console.error('Signup failed:', err);
            alert('Could not reach the server. Redeploy the client after setting REACT_APP_API_URL to your backend URL.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className="form-panel" onSubmit={handleSubmit}>
            <div className="form-group">
                <label htmlFor="first_name">First name</label>
                <input
                    id="first_name"
                    name="first_name"
                    placeholder="First name"
                    value={formData.first_name}
                    onChange={handleChange}
                    autoComplete="given-name"
                />
            </div>

            <div className="form-group">
                <label htmlFor="phone_number">Phone number</label>
                <input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    placeholder="+1 (212) 555-0100"
                    value={formData.phone_number}
                    onChange={handleChange}
                    autoComplete="tel"
                />
            </div>

            <div className="form-group">
                <label>Location</label>
                <LocationPicker
                    location={{
                        lat: formData.location_lat,
                        lng: formData.location_lng,
                        label: formData.location_label,
                    }}
                    onChange={handleLocationChange}
                />
            </div>

            <div className="form-group">
                <label>Alert timing</label>
                <div className="hebcal-note">
                    <p>
                        Times from{' '}
                        <a href="https://www.hebcal.com" target="_blank" rel="noopener noreferrer">
                            Hebcal
                        </a>{' '}
                        for your city. Choose how many minutes before candle lighting to text you
                        (1–{MAX_ALERT_MINUTES}, up to 12 hours).
                    </p>
                </div>
                <div className="alert-inputs">
                    {formData.alert_preferences.map((alert, index) => (
                        <div className="alert-row" key={index}>
                            <input
                                type="number"
                                min="1"
                                max={MAX_ALERT_MINUTES}
                                value={alert}
                                aria-label={`Alert ${index + 1} minutes before candle lighting`}
                                onChange={(e) => {
                                    const updated = [...formData.alert_preferences];
                                    updated[index] = parseInt(e.target.value, 10);
                                    setFormData({ ...formData, alert_preferences: updated });
                                }}
                            />
                            <span className="unit-label">minutes before candle lighting</span>
                        </div>
                    ))}
                    {formData.alert_preferences.length < 3 && (
                        <button
                            type="button"
                            className="btn-add-alert"
                            onClick={() => setFormData({
                                ...formData,
                                alert_preferences: [...formData.alert_preferences, 18]
                            })}
                        >
                            + Add another alert
                        </button>
                    )}
                </div>
            </div>

            {duplicatePhone && (
                <div className="signup-duplicate" role="alert">
                    <p>This phone number is already registered.</p>
                    <p>
                        <Link to="/preferences">Update your preferences</Link>
                        {' '}to change your location or alert times.
                    </p>
                </div>
            )}

            <div className="divider" />
            <div className="consent-group">
                <label className="consent-label">
                    <input
                        type="checkbox"
                        checked={consented}
                        onChange={(e) => setConsented(e.target.checked)}
                    />
                    <span>
                        I agree to receive weekly Shabbat SMS reminders from Shabbat Alert.
                        Message and data rates may apply. Reply STOP to unsubscribe.{' '}
                        <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link>.
                    </span>
                </label>
            </div>
            <button
                type="submit"
                className="btn-submit"
                disabled={submitting || !consented || !apiReady}
            >
                {submitting ? 'Signing you up…' : 'Send me Shabbat alerts'}
            </button>
        </form>
    );
}

export default SignupForm;
