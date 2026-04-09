import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cjjirwqoovypymndhvwt.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqamlyd3Fvb3Z5cHltbmRodnd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDQyOTQsImV4cCI6MjA4NzUyMDI5NH0.4IRMDKdboN2BrAfgGW9-Y6LGw6tp6yb4Sjbc9ZL3hEA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
    const { data, error } = await supabase.from('smart_farmers').select('*').limit(3);
    if (error) {
        console.error("Error fetching smart_farmers:", error);
    } else {
        console.log("smart_farmers data:", data);
    }

    const { data: gis, error: gisErr } = await supabase.from('gis_areas').select('area_name, district, latitude, longitude').not('latitude', 'is', null).limit(20);
    if (gisErr) {
        console.error("Error fetching gis_areas:", gisErr);
    } else {
        console.log("gis_areas data:", gis);
    }
}

testFetch();
