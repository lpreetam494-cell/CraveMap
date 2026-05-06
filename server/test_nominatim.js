const axios = require('axios');

(async () => {
    try {
        const nomRes = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: { q: 'Bommasandra, Bangalore', format: 'json', limit: 1 },
            headers: { 'User-Agent': 'CraveMap/1.0' }
        });
        
        if (nomRes.data.length === 0) {
            console.log("No location found");
            return;
        }

        const { lat, lon } = nomRes.data[0];
        console.log(`Resolved to Lat: ${lat}, Lon: ${lon}`);

        const query = `
            [out:json];
            nwr["amenity"="restaurant"](around:2000,${lat},${lon});
            out center;
        `;
        
        const overpassRes = await axios.get('https://overpass-api.de/api/interpreter', {
            params: { data: query },
            headers: { 'User-Agent': 'CraveMap/1.0' }
        });
        
        const names = overpassRes.data.elements.map(e => e.tags.name).filter(Boolean);
        console.log("Found restaurants:", names);
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
})();
