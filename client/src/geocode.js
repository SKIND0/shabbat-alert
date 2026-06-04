const NOMINATIM_HEADERS = {
    Accept: 'application/json',
    'User-Agent': 'ShabbatAlert/1.0 (practicum project)',
};

const PLACE_TYPES = new Set([
    'city',
    'town',
    'village',
    'administrative',
    'suburb',
    'municipality',
    'hamlet',
]);

function formatCityLabel(address) {
    if (!address) return '';

    const borough = address.suburb || address.neighbourhood || address.city_district;
    const city = address.city || address.town || address.village || address.municipality;
    const displayCity =
        borough && city && borough.toLowerCase() !== city.toLowerCase() ? borough : (city || borough);
    const state = address.state;
    const country = address.country;

    return [displayCity, state, country].filter(Boolean).join(', ');
}

function isCityLevelResult(item) {
    if (!item) return false;
    if (item.class !== 'place' && item.class !== 'boundary') return false;
    if (item.type === 'house' || item.type === 'road' || item.type === 'postcode') return false;
    if (PLACE_TYPES.has(item.type)) return true;
    if (item.addresstype && PLACE_TYPES.has(item.addresstype)) return true;
    return Boolean(formatCityLabel(item.address));
}

function mapPlace(item) {
    const label = formatCityLabel(item.address);
    if (!label) return null;

    return {
        id: String(item.place_id),
        label,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
    };
}

export async function searchPlaces(query) {
    const q = query?.trim();
    if (!q || q.length < 2) return [];

    const url =
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}` +
        '&format=json&limit=10&addressdetails=1&dedupe=1';
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!res.ok) throw new Error('Search failed');

    const data = await res.json();
    const seen = new Set();

    return data
        .filter(isCityLevelResult)
        .map(mapPlace)
        .filter((place) => {
            if (!place || seen.has(place.label)) return false;
            seen.add(place.label);
            return true;
        })
        .slice(0, 8);
}

export async function reverseGeocode(lat, lng) {
    const url =
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}` +
        '&format=json&zoom=10&addressdetails=1';
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!res.ok) throw new Error('Reverse geocode failed');

    const data = await res.json();
    const label = formatCityLabel(data.address);
    if (label) return label;

    throw new Error('Could not resolve city from location');
}
