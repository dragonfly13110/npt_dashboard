const GISTDA_API_KEY = '2lAkC1Ob7uugojJ1JlgHJPveFRdtCRg51qkZazYqh1fmEf18Me2DtLMsWLOT1aMi';

async function fetchGistdaDateItem(dateStr) {
    const url = `https://api-gateway.gistda.or.th/api/2.0/resources/stac/fire/collections/viirs_${dateStr}/items/viirs_${dateStr}`;
    
    try {
        const res = await fetch(url, { headers: { 'API-Key': GISTDA_API_KEY, 'accept': 'application/json' }});
        if (!res.ok) return null;
        
        const data = await res.json();
        if (data.assets && data.assets.data && data.assets.data.href) {
            // Check if href already has query params, and add limit
            let assetUrl = data.assets.data.href;
            if (assetUrl.includes('?')) {
                assetUrl += '&limit=5000';
            } else {
                assetUrl += '?limit=5000';
            }
            
            const assetRes = await fetch(assetUrl, { headers: { 'API-Key': GISTDA_API_KEY }});
            if (!assetRes.ok) return null;
            
            const featureCol = await assetRes.json();
            return featureCol.features || [];
        }
    } catch (e) {
        console.error(`Error fetching ${dateStr}:`, e.message);
    }
    return null;
}

async function main() {
    console.log("=== ทดสอบดึงข้อมูล GISTDA STAC วันที่ 1 - 5 มกราคม 2026 อย่างละเอียด ===\n");
    let totalNakhonPathom = 0;
    
    for (let day = 1; day <= 5; day++) {
        const dd = String(day).padStart(2, '0');
        const dateStr = `202601${dd}`;
        
        process.stdout.write(`กำลังดึงข้อมูลวันที่ ${dateStr}... `);
        const features = await fetchGistdaDateItem(dateStr);
        
        if (features) {
            const nptFeatures = features.filter(f => {
                const p = f.properties || f;
                return p.pv_idn == 73 || p.pv_tn === 'นครปฐม' || p.province_t === 'นครปฐม';
            });
            
            console.log(`พบจุดเผาทั้งประเทศ ${features.length} จุด -> เป็นของ "นครปฐม" ${nptFeatures.length} จุด`);
            
            if (nptFeatures.length > 0) {
                nptFeatures.forEach((f, i) => {
                    const p = f.properties || f;
                    const name = p.tb_tn || p.tambon_t || 'ไม่ระบุ';
                    const amp = p.ap_tn || p.amphoe_t || 'ไม่ระบุ';
                    const time = p.th_time || p.acq_time || 'ไม่ระบุ';
                    const lu = p.lu_name || p.lu_hp_name || 'ไม่ระบุพท.';
                    console.log(`   🔥 [${i+1}] ต.${name} อ.${amp} | เวลา: ${time} | ${lu}`);
                });
            }
            totalNakhonPathom += nptFeatures.length;
        } else {
            console.log(`ไม่พบข้อมูลใน STAC Catalog`);
        }
    }
    
    console.log(`\n🎉 สรุปผล: วันที่ 1-5 มกราคม 2026 นครปฐมมีจุดเผาทั้งหมด ${totalNakhonPathom} จุด`);
}

main();
