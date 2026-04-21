/**
 * Import historical GISTDA STAC hotspot data for Nakhon Pathom
 * Fetches daily data from Jan 1, 2026 to Present and upserts into Supabase.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cjjirwqoovypymndhvwt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqamlyd3Fvb3Z5cHltbmRodnd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDQyOTQsImV4cCI6MjA4NzUyMDI5NH0.4IRMDKdboN2BrAfgGW9-Y6LGw6tp6yb4Sjbc9ZL3hEA';
const GISTDA_KEY = '2lAkC1Ob7uugojJ1JlgHJPveFRdtCRg51qkZazYqh1fmEf18Me2DtLMsWLOT1aMi';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getDates(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const yyyy = currentDate.getFullYear();
        const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dd = String(currentDate.getDate()).padStart(2, '0');
        dates.push(`${yyyy}${mm}${dd}`);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

async function fetchGistdaDateItem(dateStr) {
    const url = `https://api-gateway.gistda.or.th/api/2.0/resources/stac/fire/collections/viirs_${dateStr}/items/viirs_${dateStr}`;
    
    try {
        const res = await fetch(url, { headers: { 'API-Key': GISTDA_KEY, 'accept': 'application/json' }});
        if (!res.ok) return [];
        
        const data = await res.json();
        if (data.assets && data.assets.data && data.assets.data.href) {
            let assetUrl = data.assets.data.href;
            assetUrl += assetUrl.includes('?') ? '&limit=5000' : '?limit=5000';
            
            const assetRes = await fetch(assetUrl, { headers: { 'API-Key': GISTDA_KEY }});
            if (!assetRes.ok) return [];
            
            const featureCol = await assetRes.json();
            return featureCol.features || [];
        }
    } catch (e) {
        // Quietly fail for non-existent dates
    }
    return [];
}

async function main() {
    console.log('=== 🚀 เริ่มสูบข้อมูลย้อนหลัง (1 ม.ค. - ปัจจุบัน) ===\n');
    
    // ตั้งแต่วันที่ 1 มกราคม 2026 ถึงวันนี้
    const startDate = new Date('2026-01-01');
    const today = new Date();
    // Prevent fetching future days if timezone differs
    if (today > new Date()) today.setHours(23, 59, 59, 999);
    
    const dates = getDates(startDate, today);
    console.log(`วางแผนดึงข้อมูลทั้งหมด ${dates.length} วัน...`);
    
    let allNptRows = [];
    
    // ดึงทีละ 5 วันรวด (Concurrency 5) เพื่อความรวดเร็วและไม่กวน API เกินไป
    const CONCURRENCY = 5;
    
    for (let i = 0; i < dates.length; i += CONCURRENCY) {
        const chunk = dates.slice(i, i + CONCURRENCY);
        process.stdout.write(`กำลังดึงข้อมูลชุดวันที่ ${chunk[0]} ถึง ${chunk[chunk.length-1]}... \r`);
        
        const promises = chunk.map(async (dateStr) => {
            const features = await fetchGistdaDateItem(dateStr);
            // กรองพิกัดนครปฐม
            const npt = features.filter(f => {
                const p = f.properties || f;
                return p.pv_idn == 73 || p.pv_tn === 'นครปฐม' || p.province_t === 'นครปฐม';
            });
            
            return npt.map(f => {
                const p = f.properties || f;
                const coords = f.geometry?.coordinates || [p.longitude, p.latitude];
                const lon = parseFloat(coords[0]), lat = parseFloat(coords[1]);
                
                let acqDate = p.acq_date ? (p.acq_date.includes('T') ? p.acq_date.split('T')[0] : p.acq_date) 
                            : p.th_date ? (p.th_date.includes('T') ? p.th_date.split('T')[0] : p.th_date) : null;
                let acqTime = p.acq_time ? String(p.acq_time).padStart(4, '0') 
                            : p.th_time ? String(p.th_time).padStart(4, '0') : null;
                
                const conf = (p.confidence || '').toLowerCase();
                const risk = conf === 'high' ? '\u0E2A\u0E39\u0E07' : conf === 'nominal' ? '\u0E1B\u0E32\u0E19\u0E01\u0E25\u0E32\u0E07' : conf === 'low' ? '\u0E15\u0E48\u0E33' : null;

                return {
                    latitude: lat, longitude: lon, acq_date: acqDate, acq_time: acqTime,
                    satellite: p.satellite || 'N', instrument: p.instrument || 'VIIRS',
                    confidence: p.confidence || null,
                    bright_ti4: parseFloat(p.bright_ti4 || p.brightness) || null,
                    bright_ti5: parseFloat(p.bright_ti5) || null,
                    frp: parseFloat(p.frp) || null, daynight: p.daynight || null,
                    source: 'GISTDA', district: p.ap_tn || p.amphoe_t || null, subdistrict: p.tb_tn || p.tambon_t || null,
                    land_use: p.lu_name || p.lu_hp_name || null, village: p.village || null,
                    spot_name: 'VIIRS ' + acqDate + ' ' + (acqTime || ''),
                    risk_level: risk, year: acqDate ? parseInt(acqDate.split('-')[0]) : 2026,
                };
            });
        });
        
        const results = await Promise.all(promises);
        results.forEach(r => allNptRows.push(...r));
    }
    
    // กรองเอาเฉพาะข้อมูลที่สมบูรณ์
    allNptRows = allNptRows.filter(r => r.latitude && r.longitude && r.acq_date);
    console.log(`\n\n📌 เฟ้นหาจุดเผาเฉพาะ "นครปฐม" เจอทั้งหมด ${allNptRows.length} จุด (ตั้งแต่ต้นปี)!`);
    
    if (allNptRows.length > 0) {
        console.log(`กำลังนำเข้าฐานข้อมูล Supabase (ลบตัวซ้ำออกอัตโนมัติ)...`);
        
        let ok = 0, err = 0;
        const BS = 50; // Batch Size
        for (let i = 0; i < allNptRows.length; i += BS) {
            const batch = allNptRows.slice(i, i + BS);
            const { error } = await supabase.from('fire_hotspots').upsert(batch, {
                onConflict: 'latitude,longitude,acq_date,acq_time',
                ignoreDuplicates: true,
            });
            if (error) { 
                console.error(`\n❌ Error ชุดที่ ${Math.floor(i/BS)+1}:`, error.message); 
                err += batch.length; 
            } else { 
                ok += batch.length; 
                process.stdout.write(`✅ บันทึกแล้ว ${ok} จุด... \r`);
            }
        }
        console.log(`\n🎉 สำเร็จ! แทรก/อัพเดทฐานข้อมูลทั้งหมด ${ok} จุด (Errors: ${err})`);
    } else {
        console.log('ไม่มีข้อมูลใหม่ที่จะนำเข้า');
    }
}

main().catch(e => { console.error("\n❌ Fatal Error:", e.stack); process.exit(1); });
