const axios = require('axios');

/**
 * Resolves a restaurant name and area to precise geocoordinates.
 * Tries Google Places API first (if key exists), falls back to Nominatim (OpenStreetMap).
 */
const resolveGeocoordinates = async (name, area) => {
    const query = `${name} ${area || ''}`.trim();
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    // 1. Google Places API (Production)
    if (apiKey) {
        try {
            console.log(`🗺️ Location Service: Hitting Google Places API for "${query}"`);
            const res = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
                params: {
                    query: query,
                    key: apiKey
                }
            });

            if (res.data.results && res.data.results.length > 0) {
                const place = res.data.results[0];
                return {
                    lat: place.geometry.location.lat,
                    lng: place.geometry.location.lng,
                    place_id: place.place_id,
                    formatted_address: place.formatted_address,
                    rating: place.rating,
                    maps_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
                    source: 'google'
                };
            }
        } catch (e) {
            console.error("Google Places API failed, falling back to Nominatim...", e.message);
        }
    }

    // 2. Nominatim (OpenStreetMap) Fallback (Hackathon/Free)
    try {
        console.log(`🗺️ Location Service: Hitting Nominatim (OSM) for "${query}"`);
        const fallbackQuery = `${query}, India`;
        const res = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: { q: fallbackQuery, format: 'json', limit: 1 },
            headers: { 'User-Agent': 'CraveMap-Agentic-App' }
        });

        if (res.data && res.data.length > 0) {
            const place = res.data[0];
            return {
                lat: parseFloat(place.lat),
                lng: parseFloat(place.lon),
                place_id: null,
                formatted_address: place.display_name,
                rating: null,
                maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
                source: 'osm'
            };
        }
    } catch (e) {
        console.error("Nominatim API failed:", e.message);
    }

    // Default failure
    return {
        lat: null,
        lng: null,
        maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
        source: 'none'
    };
};

/**
 * Calculates travel times from an origin to multiple destinations.
 */
const calculateTravelTime = async (originLat, originLng, destinations) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (apiKey && destinations.length > 0) {
        try {
            console.log(`🗺️ Location Service: Calculating Distance Matrix for ${destinations.length} spots`);
            const destString = destinations.map(d => `${d.lat},${d.lng}`).join('|');
            const res = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
                params: {
                    origins: `${originLat},${originLng}`,
                    destinations: destString,
                    key: apiKey
                }
            });
            
            if (res.data.rows && res.data.rows[0]) {
                return res.data.rows[0].elements.map((element, i) => ({
                    restaurant_id: destinations[i].id,
                    duration_mins: element.status === 'OK' ? Math.round(element.duration.value / 60) : null,
                    distance_km: element.status === 'OK' ? (element.distance.value / 1000).toFixed(1) : null
                }));
            }
        } catch (e) {
            console.error("Distance Matrix API failed:", e.message);
        }
    }
    
    // Fallback: Haversine distance estimate
    return destinations.map(d => {
        if (!d.lat || !d.lng || !originLat || !originLng) return { restaurant_id: d.id, duration_mins: null, distance_km: null };
        
        const R = 6371; // km
        const dLat = (d.lat - originLat) * Math.PI / 180;
        const dLon = (d.lng - originLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(originLat * Math.PI / 180) * Math.cos(d.lat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distKm = R * c;
        
        return {
            restaurant_id: d.id,
            duration_mins: Math.round(distKm * 3), // rough estimate: 3 mins per km in city traffic
            distance_km: distKm.toFixed(1)
        };
    });
};

module.exports = {
    resolveGeocoordinates,
    calculateTravelTime
};
