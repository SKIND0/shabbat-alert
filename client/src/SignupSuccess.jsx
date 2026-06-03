import { useLocation, useNavigate, Link } from 'react-router-dom';
import './SignupForm.css';

function SignupSuccess() {
    const navigate = useNavigate();
    const { state } = useLocation();
    const name = state?.name?.trim() || 'there';

    return (
        <div className="page-wrapper">
            <div className="brand-header">
                <h1>Shabbat Alert</h1>
                <div className="candle-divider">
                    <div className="line"></div>
                    <div className="dot"></div>
                    <div className="line right"></div>
                </div>
            </div>

            <div className="signup-card success-card">
                <h2>You&apos;re all set, {name}!</h2>
                <p className="card-subtitle success-message">
                    We&apos;ll text you before Shabbat based on your location and alert times.
                    Every Friday we&apos;ll remind you that you can update your city if you&apos;re traveling.
                    Reply STOP to any message to unsubscribe.
                </p>
                <button
                    type="button"
                    className="btn-submit"
                    onClick={() => navigate('/')}
                >
                    Back to home
                </button>
                <p className="success-manage">
                    Need to change settings later?{' '}
                    <Link to="/preferences">Manage your alerts</Link>
                </p>
            </div>
        </div>
    );
}

export default SignupSuccess;
