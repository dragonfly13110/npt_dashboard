const GISTDA_API_KEY = '2lAkC1Ob7uugojJ1JlgHJPveFRdtCRg51qkZazYqh1fmEf18Me2DtLMsWLOT1aMi';

async function testSTAC() {
    console.log("Fetching GISTDA STAC root/collections...");
    
    // First, try to list collections to see how far back they go
    const url = 'https://api-gateway.gistda.or.th/api/2.0/resources/stac/fire/collections';
    
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
            console.log("Got data. Collections count:", data.collections ? data.collections.length : (data.length || 'Unknown'));
            
            if (data.collections && data.collections.length > 0) {
                // Print the first few and last few collections to see date range
                console.log("Sample collections:");
                data.collections.slice(0, 5).forEach(c => console.log(" -", c.id));
                console.log("...");
                data.collections.slice(-5).forEach(c => console.log(" -", c.id));
            } else {
                console.log("Response:", JSON.stringify(data).substring(0, 500));
            }
        } else {
            console.log("Error response text:", await res.text());
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

testSTAC();
