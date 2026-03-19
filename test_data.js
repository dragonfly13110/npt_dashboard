import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';

if (supabaseUrl === 'YOUR_SUPABASE_URL_HERE') {
    console.error("Please ensure .env contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
    'personnel', 'assets', 'budgets', 'farmer_registry', 'large_plots',
    'community_enterprises', 'forecast_plots', 'smart_farmers', 'agri_tourism',
    'certifications', 'learning_centers', 'pest_centers', 'fire_hotspots', 'gis_areas'
];

async function checkData() {
    console.log("Checking row counts for tables...");
    for (const t of tables) {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`- ${t}: ERROR ${error.message}`);
        } else {
            console.log(`- ${t}: ${count} rows`);
        }
    }
}

checkData();
