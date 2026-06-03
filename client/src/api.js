// Production: empty = same-origin (client/server.js proxies to backend).
// Development: direct to local backend, or CRA proxy.
const isProd = process.env.NODE_ENV === 'production';
let apiUrl = isProd ? '' : (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');

export function loadApiConfig() {
    return Promise.resolve(getApiUrl());
}

export function getApiUrl() {
    return apiUrl;
}

export default apiUrl;
