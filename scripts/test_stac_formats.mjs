const GISTDA_API_KEY = '2lAkC1Ob7uugojJ1JlgHJPveFRdtCRg51qkZazYqh1fmEf18Me2DtLMsWLOT1aMi';

async function testSingleItem(collId) {
    const url = `https://api-gateway.gistda.or.th/api/2.0/resources/stac/fire/collections/${collId}/items/${collId}`;
    console.log(`Checking ${collId}...`);
    try {
        const res = await fetch(url, { headers: { 'API-Key': GISTDA_API_KEY, 'accept': 'application/json' }});
        console.log(` -> HTTP ${res.status}`);
        if (res.ok) {
            const data = await res.json();
            if (data.assets && data.assets.data && data.assets.data.href) {
                console.log(` -> HAS DATA ASSET`);
                
                const assetRes = await fetch(data.assets.data.href, { headers: { 'API-Key': GISTDA_API_KEY }});
                if (assetRes.ok) {
                    const featureCol = await assetRes.json();
                    const npt = (featureCol.features || []).filter(f => f.properties.pv_idn === 73 || f.properties.province_t === 'นครปฐม' || f.properties.pv_tn === 'นครปฐม');
                    console.log(` -> T: ${featureCol.features?.length}, NPT: ${npt.length}`);
                }
            }
        }
    } catch (e) {
        console.error(` -> ERR: ${e.message}`);
    }
}

async function main() {
    await testSingleItem('viirs_20260101');
    await testSingleItem('viirs_20260102');
    await testSingleItem('fire_20260101');
    await testSingleItem('fire_20260102');
    await testSingleItem('fire__20260101');
    await testSingleItem('viirs_20260410'); // test another day in April
}

main();
