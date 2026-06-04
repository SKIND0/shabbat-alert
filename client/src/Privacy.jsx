import { Link } from 'react-router-dom';
import './SignupForm.css';

function Privacy() {
    return (
        <div className="site-page">
            <div className="site-inner">
                <Link to="/" className="btn-back">← Back to home</Link>
                <div className="form-panel legal-page">
                    <h2>Privacy Policy</h2>
                    <p className="card-subtitle">Shabbat Alert · Last updated June 2026</p>

                    <p>Shabbat Alert sends SMS reminders before Shabbat and Jewish holidays. This policy explains what we collect and how we use it.</p>

                    <h3>Information we collect</h3>
                    <ul className="legal-list">
                        <li>First name and phone number (to send personalized alerts)</li>
                        <li>City/location (latitude and longitude) to calculate candle-lighting times for your area</li>
                        <li>Alert preferences (how many minutes before candle lighting to notify you)</li>
                    </ul>

                    <h3>How we use it</h3>
                    <p>Your data is used only to send the SMS alerts you signed up for. We do not sell or share your information with third parties for marketing.</p>

                    <h3>SMS messaging</h3>
                    <p>We send recurring SMS alerts about Shabbat and Jewish holidays. Message frequency varies (typically weekly plus holidays). Message and data rates may apply. Reply STOP to unsubscribe or HELP for support.</p>

                    <h3>Contact</h3>
                    <p>For questions, contact the project team through your course repository or instructor.</p>
                </div>
            </div>
        </div>
    );
}

export default Privacy;
