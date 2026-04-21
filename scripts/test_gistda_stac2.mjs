const GISTDA_API_KEY = '2lAkC1Ob7uugojJ1JlgHJPveFRdtCRg51qkZazYqh1fmEf18Me2DtLMsWLOT1aMi';

async function testItem() {
    const url = 'https://api-gateway.gistda.or.th/api/2.0/resources/stac/fire/collections/viirs_20260420/items/viirs_20260420';
    console.log(`Fetching ${url}...`);
    
    try {
        const res = await fetch(url, {
            headers: {
                'API-Key': GISTDA_API_KEY,
                'accept': 'application/json'
            }
        });
        
        console.log("Status:", res.status);
        if (res.ok) {
            const data = await res.json();
            console.log("Got Item Data:");
            console.log("ID:", data.id);
            console.log("Properties:", Object.keys(data.properties || {}));
            
            // The item in the STAC catalog probably contains a GeoJSON feature collection or an asset that connects to it.
            if (data.assets) {
                console.log("Assets:", Object.keys(data.assets));
            }
        } else {
            console.log("Error response text:", await res.text());
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

testItem();
