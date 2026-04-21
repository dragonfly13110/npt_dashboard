import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cjjirwqoovypymndhvwt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqamlyd3Fvb3Z5cHltbmRodnd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDQyOTQsImV4cCI6MjA4NzUyMDI5NH0.4IRMDKdboN2BrAfgGW9-Y6LGw6tp6yb4Sjbc9ZL3hEA';
const meteostatKey = '5a0b0d95b6msh6b69ddf45d7e6d6p1ed5abjsnf1039cc45642';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Nakhon Pathom coords
const lat = 13.8196;
const lon = 100.0602;

function getTodayString() {
    const today = new Date();
    // Use local timezone to prevent overfetching a day into the future before data forms
    const offset = today.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(today - offset)).toISOString().slice(0, -1);
    return localISOTime.split('T')[0];
}

async function startImport() {
    console.log('🔄 Starting Meteostat historical import...');
    const startDate = '2026-01-01';
    const endDate = getTodayString();
    
    console.log(`Fetch range: ${startDate} to ${endDate}`);
    
    const url = `https://meteostat.p.rapidapi.com/point/daily?lat=${lat}&lon=${lon}&start=${startDate}&end=${endDate}`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'meteostat.p.rapidapi.com',
                'x-rapidapi-key': meteostatKey
            }
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const json = await response.json();
        const records = json.data;
        
        if (!records || records.length === 0) {
            console.log('❌ No records found in this range.');
            return;
        }
        
        console.log(`✅ Fetched ${records.length} daily records. Preparing for Supabase upsert...`);
        
        // Transform for DB
        const dbRecords = records.map(r => ({
            date: r.date.split(' ')[0],
            tavg: r.tavg,
            tmin: r.tmin,
            tmax: r.tmax,
            prcp: r.prcp,
            wspd: r.wspd,
            pres: r.pres
        }));
        
        const { error } = await supabase.from('daily_weather').upsert(dbRecords, { onConflict: 'date' });
        
        if (error) {
            console.error('❌ Supabase insert error:', error.message);
        } else {
            console.log(`🎉 Successfully saved ${records.length} records to the database!`);
        }
        
    } catch (e) {
        console.error('❌ Network/Processing Error:', e.message);
    }
}

startImport();
