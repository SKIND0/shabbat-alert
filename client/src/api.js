let apiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');
let configPromise = null;

export function loadApiConfig() {
    if (configPromise) return configPromise;

    configPromise = fetch('/config.json')
        .then((res) => (res.ok ? res.json() : null))
        .then((cfg) => {
            if (cfg?.apiUrl) {
                apiUrl = String(cfg.apiUrl).replace(/\/$/, '');
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
