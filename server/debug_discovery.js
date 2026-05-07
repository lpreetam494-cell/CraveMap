const axios = require('axios');

async function debug() {
    const area = 'Indiranagar';
    
    // Step 1: Test Nominatim geocoding
    console.log('\n--- Step 1: Nominatim Geocoding ---');
    try {
        const nomRes = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: { q: `${area}, India`, format: 'json', limit: 1 },
            headers: { 'User-Agent': 'CraveMap-Debug/1.0' }
        });
        console.log('Status:', nomRes.status);
        console.log('Result:', JSON.stringify(nomRes.data));
        
        if (nomRes.data.length === 0) {
            console.log('❌ No coordinates found for this area!');
            return;
        }
        
        const { lat, lon } = nomRes.data[0];
        console.log(`✅ Coordinates: lat=${lat}, lon=${lon}`);
        
        // Step 2: Test Overpass API (GET method)
        console.log('\n--- Step 2: Overpass API (GET) ---');
        const query = `[out:json][timeout:15];(nwr["amenity"="restaurant"](around:2500,${lat},${lon}););out center 5;`;
        try {
            const overpassGet = await axios.get(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`, {
                headers: { 'User-Agent': 'CraveMap-Debug/1.0' },
                timeout: 20000
            });
            console.log('Status:', overpassGet.status);
            console.log('Elements found:', overpassGet.data?.elements?.length || 0);
            if (overpassGet.data?.elements?.length > 0) {
                console.log('First result:', JSON.stringify(overpassGet.data.elements[0]?.tags));
            }
        } catch (err) {
            console.log('❌ Overpass GET failed:', err.message);
            if (err.response) console.log('Response status:', err.response.status, err.response.data?.toString()?.slice(0, 200));
        }

        // Step 3: Test Overpass API (POST method)  
        console.log('\n--- Step 3: Overpass API (POST) ---');
        try {
            const overpassPost = await axios.post(
                'https://overpass-api.de/api/interpreter',
                `data=${encodeURIComponent(query)}`,
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 }
            );
            console.log('Status:', overpassPost.status);
            console.log('Elements found:', overpassPost.data?.elements?.length || 0);
        } catch (err) {
            console.log('❌ Overpass POST failed:', err.message);
            if (err.response) console.log('Response status:', err.response.status, err.response.data?.toString()?.slice(0, 200));
        }

    } catch (err) {
        console.log('❌ Nominatim failed:', err.message);
        if (err.response) console.log('Response:', err.response.status, err.response.data);
    }
}

debug();
