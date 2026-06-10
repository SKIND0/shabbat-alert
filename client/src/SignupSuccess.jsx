import { useLocation, Link } from 'react-router-dom';
import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';
import './SignupForm.css';

function SignupSuccess() {
    const { state } = useLocation();
    const name = state?.name?.trim() || 'there';

    return (
        <div className="site-page">
            <div className="site-inner signup-page">
                <SiteNav />

                <div className="brand-header">
                    <h1>Shabbat Alert</h1>
                    <div className="candle-divider">
                        <div className="line"></div>
                        <div className="dot"></div>
                        <div className="line right"></div>
                    </div>
                </div>

                <div className="form-panel">
                    <h2>You&apos;re all set, {name}!</h2>
                    <p className="card-subtitle success-message">
                        You should get a welcome text shortly confirming your signup.
                        We&apos;ll text you before Shabbat based on your location and alert times.
                        Reply STOP to any message to unsubscribe.
                    </p>
                    <p className="success-manage">
                        Need to change settings later?{' '}
                        <Link to="/preferences">Manage your alerts</Link>
                    </p>
                </div>

                <SiteFooter />
            </div>
        </div>
    );
}

export default SignupSuccess;
