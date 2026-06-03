let apiUrl = normalizeApiUrl(process.env.REACT_APP_API_URL || 'http://localhost:3001');
let configPromise = null;

function normalizeApiUrl(raw) {
    if (!raw) return '';
    let url = String(raw).trim().replace(/\/$/, '');
    if (!/^https?:\/\//i.test(url)) {
        url = url.startsWith('localhost') ? `http://${url}` : `https://${url}`;
    }
    return url;
}

export function loadApiConfig() {
    if (configPromise) return configPromise;

    configPromise = fetch(`/config.json?${Date.now()}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((cfg) => {
            if (cfg?.apiUrl) {
                apiUrl = normalizeApiUrl(cfg.apiUrl);
            }
            return apiUrl;
        })
        .catch(() => apiUrl);

    return configPromise;
}

export function getApiUrl() {
    return apiUrl;
}

export default apiUrl;
