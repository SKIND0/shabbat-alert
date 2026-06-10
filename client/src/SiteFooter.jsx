import { Link } from 'react-router-dom';

function SiteFooter() {
    return (
        <p className="footer-note site-footer">
            <Link to="/">Times</Link> · <Link to="/privacy">Privacy</Link> ·{' '}
            <Link to="/terms">Terms</Link>
        </p>
    );
}

export default SiteFooter;
