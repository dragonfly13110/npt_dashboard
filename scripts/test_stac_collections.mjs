const GISTDA_API_KEY = '2lAkC1Ob7uugojJ1JlgHJPveFRdtCRg51qkZazYqh1fmEf18Me2DtLMsWLOT1aMi';

async function listCollections() {
    const url = 'https://api-gateway.gistda.or.th/api/2.0/resources/stac/fire/collections'; // might need ?limit=1000
    try {
        const res = await fetch(url, { headers: { 'API-Key': GISTDA_API_KEY, 'accept': 'application/json' }});
        if (res.ok) {
            const data = await res.json();
            const cols = data.collections || [];
            console.log(`Total collections returned: ${cols.length}`);
            
            // let's grab all IDs that match 202601
            const janCols = cols.filter(c => c.id.includes('202601'));
            console.log(`Found ${janCols.length} collections for 2026-01:`);
            console.log(janCols.map(c => c.id).join(', '));
            
            // let's also check what format recent ones have
            const recentCols = cols.filter(c => c.id.includes('202604'));
            console.log(`Found ${recentCols.length} collections for 2026-04:`);
            console.log(recentCols.map(c => c.id).join(', '));
        } else {
            console.error("HTTP Error:", res.status);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

listCollections();
