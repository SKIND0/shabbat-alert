import { useNavigate, Link } from 'react-router-dom';
import SignupForm from './SignupForm';
import './SignupForm.css';

function Signup() {
    const navigate = useNavigate();

    return (
        <div className="site-page site-page--fit">
            <div className="site-inner site-inner--fit signup-page">
                <div className="signup-top">
                    <button type="button" className="btn-back" onClick={() => navigate('/')}>
                        ← Back
                    </button>
                    <p className="signup-top-title">Shabbat Alert</p>
                </div>

                <SignupForm />

                <p className="footer-note footer-note--compact">
                    Reply STOP to unsubscribe ·{' '}
                    <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link>
                </p>
            </div>
        </div>
    );
}

export default Signup;
