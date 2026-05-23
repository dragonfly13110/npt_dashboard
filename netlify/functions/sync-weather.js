import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const meteostatKey = process.env.METEOSTAT_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !meteostatKey) {
    throw new Error('Missing required env for sync-weather. Set VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY, and METEOSTAT_API_KEY.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
};

function getISODateNdaysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    const offset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d - offset)).toISOString().slice(0, -1);
    return localISOTime.split('T')[0];
}

const syncWeather = async () => {
    console.log('Triggering Daily Weather Sync (Meteostat)...');

    try {
        const lat = 13.8196;
        const lon = 100.0602;
        const start = getISODateNdaysAgo(3);
        const end = getISODateNdaysAgo(0);
        const url = `https://meteostat.p.rapidapi.com/point/daily?lat=${lat}&lon=${lon}&start=${start}&end=${end}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'meteostat.p.rapidapi.com',
                'x-rapidapi-key': meteostatKey,
            },
        });

        if (!response.ok) throw new Error(`Meteostat API Error: ${response.status}`);

        const json = await response.json();
        const records = json.data || [];

        if (records.length === 0) {
            return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'No weather data found' }) };
        }

        const dbRecords = records.map((r) => ({
            date: r.date.split(' ')[0],
            tavg: r.tavg,
            tmin: r.tmin,
            tmax: r.tmax,
            prcp: r.prcp,
            wspd: r.wspd,
            pres: r.pres,
        }));

        const { error } = await supabase.from('daily_weather').upsert(dbRecords, { onConflict: 'date' });
        if (error) throw error;

        console.log(`Success: Sync'd ${dbRecords.length} weather records`);
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: `Synced ${dbRecords.length} records` }) };
    } catch (err) {
        console.error('Sync Error:', err.message);
        return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) };
    }
};

const syncHandler = async (event = {}) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    if (event.httpMethod && !['GET', 'POST'].includes(event.httpMethod)) {
        return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    return syncWeather();
};

export const handler = schedule('0 22 * * *', syncHandler);
