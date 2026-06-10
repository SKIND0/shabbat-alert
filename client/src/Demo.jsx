import { useState } from 'react';
import { Link } from 'react-router-dom';
import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';
import './SignupForm.css';
import './Demo.css';

const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'flow', label: 'User flow' },
    { id: 'patterns', label: 'Design patterns' },
    { id: 'api', label: 'REST API' },
];

const FLOW_STEPS = [
    {
        id: 1,
        title: 'Sign up on the web',
        body: 'User enters name, phone, city, and how many minutes before candle lighting they want a reminder (1–720 min, up to 3 alerts).',
        detail: 'React form → POST /api/signup',
        icon: '📝',
    },
    {
        id: 2,
        title: 'Backend saves & welcomes',
        body: 'Express validates input, stores user + location + preferences in PostgreSQL, resolves timezone from coordinates, and sends a welcome SMS via Twilio.',
        detail: 'users · user_locations · user_preferences',
        icon: '💾',
    },
    {
        id: 3,
        title: 'Hebcal + alert planning',
        body: 'planAlertsForUser fetches this week\'s candle lighting and sunset from Hebcal (cached in shabbos_times_cache). For each alert preference, it schedules a row in alert_log.',
        detail: 'scheduled_for = candle_time − minutes',
        icon: '📅',
    },
    {
        id: 4,
        title: 'Friday morning replan',
        body: 'An hourly cron finds users in Friday 8:00–8:59 AM local time and replans alerts so times stay fresh if location or prefs changed.',
        detail: 'node-cron · per-user timezone',
        icon: '⏰',
    },
    {
        id: 5,
        title: 'SMS at the right minute',
        body: 'Every minute on Friday & Saturday UTC, sendDueAlerts finds pending alerts whose time has arrived and sends: "Hey Sarah, candle lighting at 7:42 PM…"',
        detail: 'Twilio REST · alert_log status → sent',
        icon: '📱',
    },
];

const PATTERNS = [
    {
        id: 'rest',
        name: 'REST API',
        short: 'Client ↔ server over HTTP JSON',
        detail:
            'Express exposes resource-oriented routes (/api/signup, /api/preferences/:userId). React uses fetch with GET/POST/PUT. Stateless requests; PostgreSQL holds persistent state.',
    },
    {
        id: 'mvc',
        name: 'MVC-style separation',
        short: 'Views, routes, data layer',
        detail:
            'React components are views. Express route handlers are controllers. Postgres tables (users, alert_log, shabbos_times) are the model. hebcal.js and scheduler.js are service modules.',
    },
    {
        id: 'repo',
        name: 'Repository / cache',
        short: 'Hebcal data cached in DB',
        detail:
            'fetchAndCacheShabbatTimes checks shabbos_times and shabbos_times_cache before calling Hebcal. Preset cities share one cache row to cut API calls.',
    },
    {
        id: 'cron',
        name: 'Scheduler (cron)',
        short: 'Background jobs without user action',
        detail:
            'node-cron runs planAlertsForAllUsers hourly and sendDueAlerts every minute. Alerts fire automatically — no user needs to open the app on Friday.',
    },
    {
        id: 'middleware',
        name: 'Middleware',
        short: 'Cross-cutting request handling',
        detail:
            'cors enables the React frontend on Railway. express.json() parses bodies. Twilio STOP webhook uses urlencoded parsing for inbound SMS.',
    },
    {
        id: 'builder',
        name: 'Message builder',
        short: 'Consistent SMS copy',
        detail:
            'buildShabbatMessage, buildWelcomeMessage, and buildSettingsUpdatedMessage centralize string formatting so Twilio sends the same tone everywhere.',
    },
];

const API_ENDPOINTS = [
    {
        method: 'POST',
        path: '/api/signup',
        purpose: 'Create account, plan alerts, send welcome SMS',
        body: `{
  "first_name": "Sarah",
  "phone_number": "+15551234567",
  "location_lat": 40.6782,
  "location_lng": -73.9442,
  "location_label": "Brooklyn, NY",
  "alert_preferences": [18, 60]
}`,
        response: '{ "success": true, "userId": 1 }',
    },
    {
        method: 'POST',
        path: '/api/manage/lookup',
        purpose: 'Find user by phone for preferences page',
        body: '{ "phone_number": "+15551234567" }',
        response: '{ "success": true, "userId": 1, "alert_preferences": [18], ... }',
    },
    {
        method: 'PUT',
        path: '/api/preferences/:userId',
        purpose: 'Update city and alert times, replan',
        body: '{ "location_lat", "location_lng", "location_label", "alert_preferences": [13] }',
        response: '{ "success": true }',
    },
    {
        method: 'GET',
        path: '/api/shabbat-preview?lat=&lng=',
        purpose: 'Public zmanim for home page (no login)',
        body: '(query params only)',
        response: '{ "candle_lighting_utc", "sunset_utc", "parasha_name", ... }',
    },
    {
        method: 'GET',
        path: '/shabbat-times/:userId',
        purpose: 'Cached Shabbat times for a signed-up user',
        body: '—',
        response: 'Same time fields as preview',
    },
    {
        method: 'POST',
        path: '/api/webhook/stop',
        purpose: 'Twilio inbound — user texts STOP',
        body: 'Twilio form: From=+1...',
        response: 'Empty TwiML · sets is_active = false',
    },
];

function Demo() {
    const [activeTab, setActiveTab] = useState('overview');
    const [activeStep, setActiveStep] = useState(1);
    const [expandedPattern, setExpandedPattern] = useState('rest');
    const [expandedApi, setExpandedApi] = useState(0);

    const currentStep = FLOW_STEPS.find((s) => s.id === activeStep) || FLOW_STEPS[0];

    return (
        <div className="site-page">
            <div className="site-inner demo-page">
                <SiteNav />

                <header className="demo-hero">
                    <h1 className="demo-title">Project demo</h1>
                    <div className="candle-divider">
                        <div className="line"></div>
                        <div className="dot"></div>
                        <div className="line right"></div>
                    </div>
                    <p className="demo-tagline">
                        Architecture, API, and flow — for review while carrier SMS approval is pending
                    </p>
                </header>

                <div className="demo-tabs" role="tablist" aria-label="Demo sections">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            className={activeTab === tab.id ? 'demo-tab demo-tab--active' : 'demo-tab'}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="demo-panel">
                    {activeTab === 'overview' && (
                        <div className="demo-section">
                            <div className="demo-overview-grid">
                                <article className="demo-card">
                                    <h2>What it does</h2>
                                    <p>
                                        Shabbat Alert sends personalized SMS reminders before candle
                                        lighting each week. Users sign up once with their city and how
                                        early they want to be notified; the backend handles the rest.
                                    </p>
                                </article>
                                <article className="demo-card">
                                    <h2>Stack</h2>
                                    <ul className="demo-stack-list">
                                        <li><strong>Frontend</strong> — React, React Router, plain CSS</li>
                                        <li><strong>Backend</strong> — Node.js, Express</li>
                                        <li><strong>Database</strong> — PostgreSQL (Railway)</li>
                                        <li><strong>SMS</strong> — Twilio Programmable Messaging</li>
                                        <li><strong>Times</strong> — Hebcal Shabbat + Zmanim APIs</li>
                                        <li><strong>Deploy</strong> — Railway (client + backend)</li>
                                    </ul>
                                </article>
                                <article className="demo-card demo-card--wide">
                                    <h2>Main goal</h2>
                                    <p>
                                        Help people light Shabbat candles on time without checking a
                                        calendar every Friday. The site also shows this week&apos;s zmanim
                                        for any city — no account required — on the{' '}
                                        <Link to="/">Times</Link> tab.
                                    </p>
                                    <p className="demo-note">
                                        Live SMS delivery requires Twilio toll-free / 10DLC approval.
                                        This page documents the full system either way.
                                    </p>
                                </article>
                            </div>
                        </div>
                    )}

                    {activeTab === 'flow' && (
                        <div className="demo-section">
                            <p className="demo-section-lead">
                                Click a step to walk through the end-to-end journey.
                            </p>
                            <div className="flow-layout">
                                <ol className="flow-steps">
                                    {FLOW_STEPS.map((step) => (
                                        <li key={step.id}>
                                            <button
                                                type="button"
                                                className={
                                                    activeStep === step.id
                                                        ? 'flow-step flow-step--active'
                                                        : 'flow-step'
                                                }
                                                onClick={() => setActiveStep(step.id)}
                                            >
                                                <span className="flow-step-num">{step.id}</span>
                                                <span className="flow-step-title">{step.title}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ol>
                                <div className="flow-detail" aria-live="polite">
                                    <span className="flow-detail-icon" aria-hidden="true">
                                        {currentStep.icon}
                                    </span>
                                    <h3>{currentStep.title}</h3>
                                    <p>{currentStep.body}</p>
                                    <code className="flow-detail-code">{currentStep.detail}</code>
                                    <div className="flow-nav">
                                        <button
                                            type="button"
                                            className="btn-manage flow-nav-btn"
                                            disabled={activeStep <= 1}
                                            onClick={() => setActiveStep((s) => Math.max(1, s - 1))}
                                        >
                                            Previous
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-submit flow-nav-btn"
                                            disabled={activeStep >= FLOW_STEPS.length}
                                            onClick={() =>
                                                setActiveStep((s) =>
                                                    Math.min(FLOW_STEPS.length, s + 1)
                                                )
                                            }
                                        >
                                            Next step
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'patterns' && (
                        <div className="demo-section">
                            <p className="demo-section-lead">
                                Click a pattern to expand how it appears in this project.
                            </p>
                            <div className="pattern-grid">
                                {PATTERNS.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        className={
                                            expandedPattern === p.id
                                                ? 'pattern-card pattern-card--open'
                                                : 'pattern-card'
                                        }
                                        onClick={() =>
                                            setExpandedPattern(expandedPattern === p.id ? null : p.id)
                                        }
                                    >
                                        <span className="pattern-name">{p.name}</span>
                                        <span className="pattern-short">{p.short}</span>
                                        {expandedPattern === p.id && (
                                            <p className="pattern-detail">{p.detail}</p>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'api' && (
                        <div className="demo-section">
                            <p className="demo-section-lead">
                                REST endpoints exposed by the Express backend. Click to expand.
                            </p>
                            <ul className="api-list">
                                {API_ENDPOINTS.map((ep, index) => (
                                    <li key={ep.path + ep.method} className="api-item">
                                        <button
                                            type="button"
                                            className="api-item-head"
                                            aria-expanded={expandedApi === index}
                                            onClick={() =>
                                                setExpandedApi(expandedApi === index ? -1 : index)
                                            }
                                        >
                                            <span className={`api-method api-method--${ep.method.toLowerCase()}`}>
                                                {ep.method}
                                            </span>
                                            <span className="api-path">{ep.path}</span>
                                            <span className="api-purpose">{ep.purpose}</span>
                                            <span className="api-chevron" aria-hidden="true">
                                                {expandedApi === index ? '−' : '+'}
                                            </span>
                                        </button>
                                        {expandedApi === index && (
                                            <div className="api-item-body">
                                                {ep.body !== '—' && (
                                                    <>
                                                        <p className="api-label">Request</p>
                                                        <pre>{ep.body}</pre>
                                                    </>
                                                )}
                                                <p className="api-label">Response</p>
                                                <pre>{ep.response}</pre>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="demo-footer-cta">
                    <p>Interactive live demo (signup + sample SMS preview) coming next on this page.</p>
                </div>

                <SiteFooter />
            </div>
        </div>
    );
}

export default Demo;
