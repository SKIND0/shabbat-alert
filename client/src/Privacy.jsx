import { Link } from 'react-router-dom';
import './SignupForm.css';

function Privacy() {
    return (
        <div className="page-wrapper">
            <Link to="/" className="btn-back">← Back to home</Link>
            <div className="signup-card legal-card">
                <h2>Privacy Policy</h2>
                <p className="card-subtitle">Shabbat Alert · Last updated June 2026</p>

                <p>Shabbat Alert sends SMS reminders before Shabbat and Jewish holidays. This policy explains what we collect and how we use it.</p>

                <h3>Information we collect</h3>
                <ul className="legal-list">
                    <li>First name and phone number (to send personalized alerts)</li>
                    <li>City/location (latitude and longitude) to calculate candle-lighting times for your area</li>
                    <li>Alert preferences (timing and zmanim opinion)</li>
                </ul>

                <h3>How we use it</h3>
                <p>Your data is used only to send the SMS alerts you signed up for. We do not sell or share your information with third parties for marketing.</p>

                <h3>SMS</h3>
                <p>Message and data rates may apply. You can reply STOP to any message to unsubscribe. Reply HELP for support.</p>

                <h3>Contact</h3>
                <p>For questions, contact the project team through your course repository or instructor.</p>
            </div>
        </div>
    );
}

export default Privacy;
