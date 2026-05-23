import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const GISTDA_KEY = process.env.GISTDA_API_KEY || process.env.VITE_GISTDA_API_KEY;
const THAILAND_NAME = '\u0e23\u0e32\u0e0a\u0e2d\u0e32\u0e13\u0e32\u0e08\u0e31\u0e01\u0e23\u0e44\u0e17\u0e22';

if (!SUPABASE_URL || !SUPABASE_KEY || !GISTDA_KEY) {
    throw new Error('Missing required env for sync-hotspots. Set VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY, and GISTDA_API_KEY.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const syncHandler = async () => {
    console.log('Triggering Daily Fire Hotspot Sync...');

    try {
        const url = `https://api-gateway.gistda.or.th/api/2.0/resources/features/viirs/30days?limit=5000&offset=0&ct_tn=${encodeURIComponent(THAILAND_NAME)}&pv_idn=73`;
        const res = await fetch(url, { headers: { 'API-Key': GISTDA_KEY, 'accept': 'application/json' } });
        if (!res.ok) throw new Error(`GISTDA API Error: ${res.status}`);

        const json = await res.json();
        const features = json.features || json.data || [];
        if (features.length === 0) {
            return { statusCode: 200, body: JSON.stringify({ message: 'No data found from GISTDA' }) };
        }

        const rows = features.map((item) => {
            const p = item.properties || item;
            const coords = item.geometry?.coordinates || [p.longitude, p.latitude];
            const lon = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);
            const acqDate = p.acq_date
                ? (p.acq_date.includes('T') ? p.acq_date.split('T')[0] : p.acq_date)
                : p.th_date
                    ? (p.th_date.includes('T') ? p.th_date.split('T')[0] : p.th_date)
                    : null;
            const acqTime = p.acq_time ? String(p.acq_time).padStart(4, '0') : p.th_time ? String(p.th_time).padStart(4, '0') : null;
            const conf = (p.confidence || '').toLowerCase();
            const risk = conf === 'high' ? '\u0E2A\u0E39\u0E07' : conf === 'nominal' ? '\u0E1B\u0E32\u0E19\u0E01\u0E25\u0E32\u0E07' : conf === 'low' ? '\u0E15\u0E48\u0E33' : null;

            return {
                latitude: lat,
                longitude: lon,
                acq_date: acqDate,
                acq_time: acqTime,
                satellite: p.satellite || 'N',
                instrument: p.instrument || 'VIIRS',
                confidence: p.confidence || null,
                bright_ti4: parseFloat(p.bright_ti4 || p.brightness) || null,
                bright_ti5: parseFloat(p.bright_ti5) || null,
                frp: parseFloat(p.frp) || null,
                daynight: p.daynight || null,
                source: 'GISTDA',
                district: p.ap_tn || null,
                subdistrict: p.tb_tn || null,
                land_use: p.lu_name || null,
                village: p.village || null,
                spot_name: `VIIRS ${acqDate} ${acqTime || ''}`,
                risk_level: risk,
                year: acqDate ? parseInt(acqDate.split('-')[0]) : 2026,
            };
        }).filter((row) => row.latitude && row.longitude && row.acq_date);

        const latestRecord = rows.reduce((latest, row) => {
            if (!latest) return row;
            const currentKey = `${row.acq_date || ''}${row.acq_time || ''}`;
            const latestKey = `${latest.acq_date || ''}${latest.acq_time || ''}`;
            return currentKey > latestKey ? row : latest;
        }, null);

        const { error } = await supabase.from('fire_hotspots').upsert(rows, {
            onConflict: 'latitude,longitude,acq_date,acq_time',
            ignoreDuplicates: true,
        });
        if (error) throw error;

        console.log(`Success: Sync'd ${rows.length} records. Latest: ${latestRecord?.acq_date || '-'} ${latestRecord?.acq_time || ''}`);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Synced ${rows.length} records`,
                latest: latestRecord
                    ? {
                        acq_date: latestRecord.acq_date,
                        acq_time: latestRecord.acq_time,
                        district: latestRecord.district,
                        subdistrict: latestRecord.subdistrict,
                    }
                    : null,
            }),
        };
    } catch (err) {
        console.error('Sync Error:', err.message);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};

export const handler = schedule('0 6 * * *', syncHandler);
