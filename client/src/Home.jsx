import { useNavigate, Link } from 'react-router-dom';
import './SignupForm.css';
import './Home.css';

function Home() {
    const navigate = useNavigate();

    return (
        <div className="site-page">
            <div className="site-inner site-inner--center home-page">
                <div className="home-body">
                    <div className="home-hero">
                        <div className="candle-icon">🕯️</div>
                        <h1 className="home-title">Shabbat Alert</h1>
                        <div className="candle-divider">
                            <div className="line"></div>
                            <div className="dot"></div>
                            <div className="line right"></div>
                        </div>
                        <p className="home-tagline">Never miss the zman again</p>
                    </div>

                    <div className="home-explanation">
                        <p>
                            Get a personalized SMS reminder before Shabbat and Jewish holidays —
                            based on your location and how early you want to be notified.
                        </p>
                        <p className="sms-disclosure">
                            Shabbat Alert is an SMS-only service. By signing up you opt in to
                            recurring text messages (typically weekly plus holidays). Message and
                            data rates may apply. Reply STOP to unsubscribe.
                        </p>
                        <ul className="home-features">
                            <li><span className="feature-dot">✦</span> One-time setup, under a minute</li>
                            <li><span className="feature-dot">✦</span> Candle-lighting times from Hebcal</li>
                            <li><span className="feature-dot">✦</span> Your name, your city, your timing</li>
                            <li><span className="feature-dot">✦</span> Reply STOP to unsubscribe anytime</li>
                        </ul>
                    </div>

                    <div className="home-actions">
                        <button className="btn-submit home-btn" onClick={() => navigate('/signup')}>
                            Set up my alerts
                        </button>
                        <button className="btn-manage" onClick={() => navigate('/preferences')}>
                            Manage existing alerts
                        </button>
                    </div>
                </div>

                <p className="footer-note">
                    SMS alerts · No app download required · Reply STOP to unsubscribe ·{' '}
                    <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link>
                </p>
            </div>
        </div>
    );
}

export default Home;
