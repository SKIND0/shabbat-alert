import { NavLink } from 'react-router-dom';
import './SiteNav.css';

function SiteNav() {
    return (
        <nav className="site-nav" aria-label="Main">
            <NavLink to="/" className="site-nav-brand" end>
                <span className="site-nav-icon" aria-hidden="true">🕯️</span>
                <span>Shabbat Alert</span>
            </NavLink>
            <div className="site-nav-links">
                <NavLink to="/" className="site-nav-link" end>
                    Times
                </NavLink>
                <NavLink to="/demo" className="site-nav-link">
                    Demo
                </NavLink>
                <NavLink to="/signup" className="site-nav-link site-nav-link--cta">
                    Sign up
                </NavLink>
                <NavLink to="/preferences" className="site-nav-link">
                    Manage
                </NavLink>
            </div>
        </nav>
    );
}

export default SiteNav;
