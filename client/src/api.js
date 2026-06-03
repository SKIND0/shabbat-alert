const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');

export function loadApiConfig() {
    return Promise.resolve(API_URL);
}

export function getApiUrl() {
    return API_URL;
}

export default API_URL;
