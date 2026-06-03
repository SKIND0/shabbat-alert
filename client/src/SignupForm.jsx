import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './SignupForm.css';
import { loadApiConfig, getApiUrl } from './api';
import LocationPicker from './LocationPicker';

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
            const data = await res.json();
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
        } catch {
            alert(`Could not reach the server (${getApiUrl()}). Check REACT_APP_API_URL on Railway and redeploy.`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className="signup-card" onSubmit={handleSubmit}>
            <h2>Create your alert</h2>
            <p className="card-subtitle">One-time setup · takes under a minute</p>

            <div className="form-group">
                <label>First name</label>
                <input
                    name="first_name"
                    placeholder="First name"
                    value={formData.first_name}
                    onChange={handleChange}
                    autoComplete="given-name"
                />
            </div>

            <div className="form-group">
                <label>Phone number</label>
                <input
                    name="phone_number"
                    type="tel"
                    placeholder="+1 (212) 555-0100"
                    value={formData.phone_number}
                    onChange={handleChange}
                    autoComplete="tel"
                />
            </div>

            <div className="form-group">
                <label>Zmanim opinion</label>
                <div className="select-wrapper">
                    <select
                        name="zmanim_opinion"
                        value={formData.zmanim_opinion}
                        onChange={handleChange}
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
                    {formData.alert_preferences.map((alert, index) => (
                        <div className="alert-row" key={index}>
                            <input
                                type="number"
                                value={alert}
                                onChange={(e) => {
                                    const updated = [...formData.alert_preferences];
                                    updated[index] = parseInt(e.target.value, 10);
                                    setFormData({ ...formData, alert_preferences: updated });
                                }}
                            />
                            <span className="unit-label">minutes before</span>
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

            {duplicatePhone && (
                <div className="signup-duplicate" role="alert">
                    <p>This phone number is already registered.</p>
                    <p>
                        <Link to="/preferences">Update your preferences</Link>
                        {' '}to change your location, alert times, or zmanim.
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
                        I agree to receive SMS alerts. Message and data rates may apply.
                        Reply STOP to unsubscribe.
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
