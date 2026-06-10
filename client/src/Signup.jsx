import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';
import SignupForm from './SignupForm';
import './SignupForm.css';

function Signup() {
    return (
        <div className="site-page">
            <div className="site-inner signup-page">
                <SiteNav />

                <div className="signup-hero">
                    <h1 className="signup-title">Sign up</h1>
                    <div className="candle-divider">
                        <div className="line"></div>
                        <div className="dot"></div>
                        <div className="line right"></div>
                    </div>
                    <p className="signup-tagline">Create your weekly reminder</p>
                </div>

                <SignupForm />

                <SiteFooter />
            </div>
        </div>
    );
}

export default Signup;
