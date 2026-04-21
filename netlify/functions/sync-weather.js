import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cjjirwqoovypymndhvwt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqamlyd3Fvb3Z5cHltbmRodnd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDQyOTQsImV4cCI6MjA4NzUyMDI5NH0.4IRMDKdboN2BrAfgGW9-Y6LGw6tp6yb4Sjbc9ZL3hEA';
const meteostatKey = '5a0b0d95b6msh6b69ddf45d7e6d6p1ed5abjsnf1039cc45642'; // Hardcode since provided

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getISODateNdaysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    // Adjust logic if timezone is required
    const offset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d - offset)).toISOString().slice(0, -1);
    return localISOTime.split('T')[0];
}

const syncHandler = async (event, context) => {
    console.log('🔄 Triggering Daily Weather Sync (Meteostat)...');

    try {
        const lat = 13.8196;
        const lon = 100.0602;
        // Fetch last 3 days to always ensure we fill in data correctly
        const start = getISODateNdaysAgo(3);
        const end = getISODateNdaysAgo(0);

        const url = `https://meteostat.p.rapidapi.com/point/daily?lat=${lat}&lon=${lon}&start=${start}&end=${end}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'meteostat.p.rapidapi.com',
                'x-rapidapi-key': meteostatKey
            }
        });

        if (!response.ok) {
            throw new Error(`Meteostat API Error: ${response.status}`);
        }

        const json = await response.json();
        const records = json.data || [];
        
        if (records.length === 0) {
            return { statusCode: 200, body: JSON.stringify({ message: "No weather data found" }) };
        }

        const dbRecords = records.map(r => ({
            date: r.date.split(' ')[0], // '2026-04-20'
            tavg: r.tavg,
            tmin: r.tmin,
            tmax: r.tmax,
            prcp: r.prcp,
            wspd: r.wspd,
            pres: r.pres
        }));

        const { data, error } = await supabase.from('daily_weather').upsert(dbRecords, {
            onConflict: 'date'
        });

        if (error) throw error;

        console.log(`✅ Success: Sync'd ${dbRecords.length} weather records`);
        return { statusCode: 200, body: JSON.stringify({ message: `Synced ${dbRecords.length} records` }) };

    } catch (err) {
        console.error('❌ Sync Error:', err.message);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};

// Run this function every day at 1:00 AM UTC (approx 8 AM local time)
export const handler = schedule("0 1 * * *", syncHandler);
