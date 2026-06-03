import { useState } from 'react';
import './SignupForm.css';
import API_URL from './api';

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

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGPS = () => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setFormData({
                    ...formData,
                    location_lat: pos.coords.latitude,
                    location_lng: pos.coords.longitude,
                    location_label: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
                });
            },
            (err) => {
                alert('Could not get location. Please enter it manually.');
            }
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
                setFormData(prev => ({
                    ...prev,
                    location_lat: parseFloat(data[0].lat),
                    location_lng: parseFloat(data[0].lon),
                    location_label: label
                }));
            } else {
                alert('Location not found. Try a different city name.');
            }
        } catch {
            alert('Could not look up location.');
        }
    };
    const handleSubmit = async () => {
        if (!consented) {
            alert('Please agree to receive SMS alerts.');
            return;
        }
        if (!formData.first_name || !formData.phone_number) {
            alert('Please enter your name and phone number.');
            return;
        }
        if (!formData.location_lat || !formData.location_lng) {
            alert('Please enter a location or use Detect.');
            return;
        }

        const res = await fetch(`${API_URL}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.success) alert('You\'re signed up!');
        else alert('Error: ' + data.error);
    };

    return (
        <div className="signup-card">
            <h2>Create your alert</h2>
            <p className="card-subtitle">One-time setup · takes under a minute</p>

            <div className="form-group">
                <label>First name</label>
                <input
                    name="first_name"
                    placeholder="Sarah"
                    value={formData.first_name}
                    onChange={handleChange}
                />
            </div>

            <div className="form-group">
                <label>Phone number</label>
                <input
                    name="phone_number"
                    placeholder="+1 (212) 555-0100"
                    value={formData.phone_number}
                    onChange={handleChange}
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
                                    updated[index] = parseInt(e.target.value);
                                    setFormData({ ...formData, alert_preferences: updated });
                                }}
                            />
                            <span className="unit-label">minutes before</span>
                        </div>
                    ))}
                    {formData.alert_preferences.length < 3 && (
                        <button
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
                <div className="location-row">
                    <input
                        name="location_label"
                        placeholder="Brooklyn, NY"
                        value={formData.location_label}
                        onChange={handleChange}
                        onBlur={(e) => geocodeLocation(e.target.value)}
                    />
                    <button className="btn-gps" onClick={handleGPS}>
                        Detect
                    </button>
                </div>
            </div>
            <div className="divider" />
            <div className="form-group">
                <label className="checkbox-label">
                    <input type="checkbox" checked={consented} onChange={e => setConsented(e.target.checked)} />
                    I agree to receive SMS alerts. Message and data rates may apply. Reply STOP to unsubscribe.
                </label>
            </div>
            <button className="btn-submit" onClick={handleSubmit}>
                Send me Shabbat alerts
            </button>
        </div>
    );
}

export default SignupForm;