import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';
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
    return (
        <div className="site-page">
            <div className="site-inner home-page">
                <SiteNav />

                <header className="times-hero">
                    <h1 className="times-title">Shabbat zmanim</h1>
                    <div className="candle-divider">
                        <div className="line"></div>
                        <div className="dot"></div>
                        <div className="line right"></div>
                    </div>
                    <p className="times-tagline">This week · any city · free</p>
                </header>

                <ShabbatTimesPanel initialLocation={DEFAULT_LOCATION} />

                <SiteFooter />
            </div>
        </div>
    );
}

export default Home;
