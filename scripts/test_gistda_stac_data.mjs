const GISTDA_API_KEY = '2lAkC1Ob7uugojJ1JlgHJPveFRdtCRg51qkZazYqh1fmEf18Me2DtLMsWLOT1aMi';

async function testAsset() {
    const url = 'https://api-gateway.gistda.or.th/api/2.0/resources/stac/fire/collections/viirs_20260420/items/viirs_20260420';
    
    try {
        const res = await fetch(url, { headers: { 'API-Key': GISTDA_API_KEY, 'accept': 'application/json' }});
        if (res.ok) {
            const data = await res.json();
            console.log("Data Asset URL:", data.assets.data.href);
            
            // Now fetch the actual data
            const assetRes = await fetch(data.assets.data.href, { headers: { 'API-Key': GISTDA_API_KEY }});
            if (assetRes.ok) {
                const featureCol = await assetRes.json();
                console.log("Got feature collection!");
                console.log("Type:", featureCol.type);
                console.log("Total features:", featureCol.features ? featureCol.features.length : 0);
                
                if (featureCol.features && featureCol.features.length > 0) {
                    console.log("Sample feature properties:", featureCol.features[0].properties);
                }
            } else {
                console.log("Failed to fetch asset:", await assetRes.text());
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

testAsset();
