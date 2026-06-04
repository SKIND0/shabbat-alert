import { Link } from 'react-router-dom';
import './SignupForm.css';

function Terms() {
    return (
        <div className="page-wrapper">
            <Link to="/" className="btn-back">← Back to home</Link>
            <div className="signup-card legal-card">
                <h2>Terms of Service</h2>
                <p className="card-subtitle">Shabbat Alert · Last updated June 2026</p>

                <p>By signing up for Shabbat Alert, you agree to receive recurring SMS messages about Shabbat and Jewish holiday start times based on the location and preferences you provide.</p>

                <h3>Opt-in</h3>
                <p>You must check the consent box on our signup page before submitting. The checkbox is not pre-selected.</p>

                <h3>Opt-out</h3>
                <p>Reply STOP to any message to unsubscribe. You may also manage preferences at our website.</p>

                <h3>Accuracy</h3>
                <p>Times are sourced from Hebcal and depend on your saved location. Update your city if you travel.</p>

                <h3>No warranty</h3>
                <p>This is a student practicum project. Use at your own discretion for religious timing.</p>
            </div>
        </div>
    );
}

export default Terms;
