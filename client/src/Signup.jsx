import { useNavigate } from 'react-router-dom';
import SignupForm from './SignupForm';
import './SignupForm.css';

function Signup() {
    const navigate = useNavigate();

    return (
        <div className="page-wrapper">
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
                By signing up you agree to receive SMS alerts · Reply STOP to unsubscribe at any time
            </p>
        </div>
    );
}

export default Signup;