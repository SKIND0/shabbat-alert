import { Link } from 'react-router-dom';
import SignupForm from './SignupForm';
import './SignupForm.css';

function Signup() {
    return (
        <div className="site-page">
            <div className="site-inner signup-page">
                <header className="page-header">
                    <Link to="/" className="page-nav-link">← Back to home</Link>
                </header>

                <div className="signup-hero">
                    <h1 className="signup-title">Shabbat Alert</h1>
                    <div className="candle-divider">
                        <div className="line"></div>
                        <div className="dot"></div>
                        <div className="line right"></div>
                    </div>
                    <p className="signup-tagline">Create your weekly reminder</p>
                </div>

                <SignupForm />

                <p className="footer-note">
                    Reply STOP to unsubscribe ·{' '}
                    <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link>
                </p>
            </div>
        </div>
    );
}

export default Signup;
