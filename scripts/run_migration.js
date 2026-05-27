/**
 * Run migration: Add new columns to farmer_registry table
 */
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;

if (!ACCESS_TOKEN || !PROJECT_REF) {
    console.error('Missing required env: SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF');
    process.exit(1);
}

async function runMigration() {
    const sql = `
        ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS target INTEGER;
        ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS update_tbk_households INTEGER;
        ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS update_tbk_plots INTEGER;
        ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS update_tbk_area_rai NUMERIC;
        ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS update_farmbook_households INTEGER;
        ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS update_farmbook_plots INTEGER;
        ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS update_farmbook_area_rai NUMERIC;
        ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS update_eform_households INTEGER;
        ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS update_eform_plots INTEGER;
        ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS update_eform_area_rai NUMERIC;
        ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS total_updated_households INTEGER;
        ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS total_updated_plots INTEGER;
        ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS total_updated_area_rai NUMERIC;
        ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS cancelled_households INTEGER;
        ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS net_total_households INTEGER;
        ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS cutoff_date DATE;
    `;

    console.log('🔧 Running migration via Supabase Management API...');

    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
    });

    const text = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${text}`);

    if (response.ok) {
        console.log('✅ Migration completed successfully!');

        // Now add the unique constraint
        console.log('\n🔧 Adding unique constraint...');
        const constraintSql = `
            ALTER TABLE farmer_registry DROP CONSTRAINT IF EXISTS farmer_registry_district_year_uq;
            ALTER TABLE farmer_registry ADD CONSTRAINT farmer_registry_district_year_uq UNIQUE (district, data_year);
        `;

        const resp2 = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: constraintSql }),
        });

        const text2 = await resp2.text();
        console.log(`Status: ${resp2.status}`);
        console.log(`Response: ${text2}`);

        if (resp2.ok) {
            console.log('✅ Unique constraint added!');
        } else {
            console.log('⚠️ Constraint may already exist or table has duplicates');
        }
    } else {
        console.error('❌ Migration failed');
    }
}

runMigration();
