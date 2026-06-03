const NOMINATIM_HEADERS = {
    Accept: 'application/json',
    'User-Agent': 'ShabbatAlert/1.0 (practicum project)',
};

export async function searchPlaces(query) {
    const q = query?.trim();
    if (!q || q.length < 2) return [];

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`;
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!res.ok) throw new Error('Search failed');

    const data = await res.json();
    return data.map((item) => ({
        id: String(item.place_id),
        label: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
    }));
}

export async function reverseGeocode(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!res.ok) throw new Error('Reverse geocode failed');

    const data = await res.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
