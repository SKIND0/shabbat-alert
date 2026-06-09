import { useNavigate, Link } from 'react-router-dom';
import SiteNav from './SiteNav';
import ShabbatTimesPanel from './ShabbatTimesPanel';
import { DEFAULT_CITY } from './presets';
import './SignupForm.css';
import './Home.css';

const DEFAULT_LOCATION = {
    location_lat: DEFAULT_CITY.location_lat,
    location_lng: DEFAULT_CITY.location_lng,
    location_label: DEFAULT_CITY.label,
    timezone: DEFAULT_CITY.timezone,
};

function Home() {
    const navigate = useNavigate();

    return (
        <div className="site-page">
            <div className="site-inner home-page">
                <SiteNav />

                <div className="home-intro">
                    <div className="home-hero">
                        <h1 className="home-title">Light candles on time</h1>
                        <div className="candle-divider">
                            <div className="line"></div>
                            <div className="dot"></div>
                            <div className="line right"></div>
                        </div>
                        <p className="home-tagline">
                            Weekly SMS reminders · Free Shabbat times for any city
                        </p>
                    </div>

                    <p className="home-lead">
                        Look up this week&apos;s zmanim below — no account needed. When you&apos;re
                        ready, sign up once and we&apos;ll text you before candle lighting in your city.
                    </p>
                </div>

                <ShabbatTimesPanel initialLocation={DEFAULT_LOCATION} />

                <div className="home-below-times">
                    <ul className="home-features">
                        <li><span className="feature-dot">✦</span> Hebcal times for your city</li>
                        <li><span className="feature-dot">✦</span> Up to 3 reminders per week</li>
                        <li><span className="feature-dot">✦</span> One-minute signup, no app</li>
                        <li><span className="feature-dot">✦</span> Reply STOP to unsubscribe</li>
                    </ul>

                    <div className="home-actions">
                        <button
                            className="btn-submit home-btn"
                            type="button"
                            onClick={() => navigate('/signup')}
                        >
                            Set up my alerts
                        </button>
                        <button
                            className="btn-manage"
                            type="button"
                            onClick={() => navigate('/preferences')}
                        >
                            Manage existing alerts
                        </button>
                        <Link to="/demo" className="home-demo-link">
                            View project demo & architecture →
                        </Link>
                    </div>
                </div>

                <p className="footer-note">
                    SMS alerts · No app required ·{' '}
                    <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link>
                </p>
            </div>
        </div>
    );
}

export default Home;
