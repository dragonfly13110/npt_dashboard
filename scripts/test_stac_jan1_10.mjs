const GISTDA_API_KEY = '2lAkC1Ob7uugojJ1JlgHJPveFRdtCRg51qkZazYqh1fmEf18Me2DtLMsWLOT1aMi';

async function fetchGistdaDateItem(dateStr) {
    // try to fetch the item directly
    const url = `https://api-gateway.gistda.or.th/api/2.0/resources/stac/fire/collections/viirs_${dateStr}/items/viirs_${dateStr}`;
    
    try {
        const res = await fetch(url, { headers: { 'API-Key': GISTDA_API_KEY, 'accept': 'application/json' }});
        if (!res.ok) return null;
        
        const data = await res.json();
        if (data.assets && data.assets.data && data.assets.data.href) {
            // fetch the actual geojson data
            const assetRes = await fetch(data.assets.data.href, { headers: { 'API-Key': GISTDA_API_KEY }});
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
    console.log("=== ทดสอบดึงข้อมูล GISTDA STAC วันที่ 1 - 10 มกราคม 2026 ===\n");
    let totalNakhonPathom = 0;
    
    // วนลูปตั้งแต่วันที่ 1 ถึง 10
    for (let day = 1; day <= 10; day++) {
        const dd = String(day).padStart(2, '0');
        const dateStr = `202601${dd}`;
        
        process.stdout.write(`กำลังดึงข้อมูลวันที่ ${dateStr}... `);
        const features = await fetchGistdaDateItem(dateStr);
        
        if (features) {
            // filter หาเฉพาะนครปฐม (pv_idn = 73 หรือ province_t มีคำว่า 'นครปฐม')
            // ปกติ GISTDA 30days ใช้ pv_idn=73 ลองดู properties ต่างๆ
            const nptFeatures = features.filter(f => {
                const p = f.properties;
                return p.pv_idn === 73 || p.pv_tn === 'นครปฐม' || p.province_t === 'นครปฐม';
            });
            
            console.log(`พบจุดเผาทั้งประเทศ ${features.length} จุด -> เป็นของ "นครปฐม" ${nptFeatures.length} จุด`);
            
            if (nptFeatures.length > 0) {
                nptFeatures.forEach((f, i) => {
                    const p = f.properties;
                    console.log(`   🔥 [${i+1}] ต.${p.tb_tn || p.tambon_t} อ.${p.ap_tn || p.amphoe_t} | เวลา: ${p.th_time || p.acq_time} | ${p.lu_name || p.lu_hp_name || 'ไม่ระบุพท.'}`);
                });
            }
            totalNakhonPathom += nptFeatures.length;
        } else {
            console.log(`ไม่พบข้อมูลใน STAC Catalog (อาจจะไม่มีจุดเผาเลยทั้งประเทศ หรือ catalog ชั่วคราวไม่พร้อม)`);
        }
    }
    
    console.log(`\n🎉 สรุปผล: วันที่ 1-10 มกราคม 2026 นครปฐมมีจุดเผาทั้งหมด ${totalNakhonPathom} จุด`);
}

main();
