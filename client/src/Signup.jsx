import { useNavigate, Link } from 'react-router-dom';
import SignupForm from './SignupForm';
import './SignupForm.css';

function Signup() {
    const navigate = useNavigate();

    return (
        <div className="site-page">
            <div className="site-inner">
                <button type="button" className="btn-back" onClick={() => navigate('/')}>
                    ← Back to home
                </button>
                <div className="brand-header">
                    <h1>Shabbat Alert</h1>
                    <div className="candle-divider">
                        <div className="line"></div>
                        <div className="dot"></div>
                        <div className="line right"></div>
                    </div>
                    <p className="tagline">Never miss the zman again</p>
                </div>

                <SignupForm />

                <p className="footer-note">
                    By signing up you agree to receive recurring SMS from Shabbat Alert ·
                    Reply STOP to unsubscribe ·{' '}
                    <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link>
                </p>
            </div>
        </div>
    );
}

export default Signup;
