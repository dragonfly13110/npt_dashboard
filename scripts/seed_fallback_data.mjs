import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

function loadEnv(file = '.env') {
  if (!fs.existsSync(file)) return {};
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return env;
      const index = trimmed.indexOf('=');
      if (index === -1) return env;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed
        .slice(index + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
      env[key] = value;
      return env;
    }, {});
}

async function main() {
  const env = { ...loadEnv(), ...process.env };
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env'
    );
  }

  console.log(`Connecting to Supabase at: ${supabaseUrl}`);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // 1. Seed production_costs
  console.log('\n--- Seeding production_costs ---');
  const productionCostsFile = path.resolve(
    'src/data/production_costs_2567.json'
  );
  if (fs.existsSync(productionCostsFile)) {
    const rawCosts = JSON.parse(fs.readFileSync(productionCostsFile, 'utf8'));
    console.log(`Loaded ${rawCosts.length} production costs records.`);

    // We will upsert using the unique constraint (data_year, crop_name)
    const { error } = await supabase
      .from('production_costs')
      .upsert(rawCosts, { onConflict: 'data_year,crop_name' });

    if (error) {
      console.error('Error upserting production_costs:', error);
    } else {
      console.log('Successfully upserted production_costs!');
    }
  } else {
    console.log('Warning: production_costs_2567.json not found.');
  }

  // 2. Seed agri_tourism
  console.log('\n--- Seeding agri_tourism ---');
  const agriTourismFile = path.resolve('src/data/agri_tourism_seed.json');
  if (fs.existsSync(agriTourismFile)) {
    const rawAgri = JSON.parse(fs.readFileSync(agriTourismFile, 'utf8'));
    console.log(`Loaded ${rawAgri.length} agri_tourism records.`);

    // Omit local string 'id' so Supabase generates UUID
    const cleanAgri = rawAgri.map((item) => {
      const { id, ...rest } = item;
      return rest;
    });

    // Clear existing rows (if any) first to avoid duplicates since there's no unique key
    console.log('Clearing existing agri_tourism records...');
    const { error: deleteError } = await supabase
      .from('agri_tourism')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

    if (deleteError) {
      console.log('Delete status/note:', deleteError);
    }

    const { error: insertError } = await supabase
      .from('agri_tourism')
      .insert(cleanAgri);

    if (insertError) {
      console.error('Error inserting agri_tourism:', insertError);
    } else {
      console.log('Successfully seeded agri_tourism!');
    }
  } else {
    console.log('Warning: agri_tourism_seed.json not found.');
  }

  // 3. Seed disasters
  console.log('\n--- Seeding disasters ---');
  const disastersFile = path.resolve('src/data/disasters_by_village_seed.json');
  if (fs.existsSync(disastersFile)) {
    const rawDisasters = JSON.parse(fs.readFileSync(disastersFile, 'utf8'));
    console.log(`Loaded ${rawDisasters.length} disasters records.`);

    // Map keys to database column names and omit local string 'id'
    const mappedDisasters = rawDisasters.map((item) => ({
      year: item.year ? Number(item.year) : null,
      district: item.district || null,
      subdistrict: item.subdistrict || null,
      village_no: item.village_no ? String(item.village_no) : '',
      disaster_type: item.disaster_type || null,
      damaged_area: item.affected_area_rai ?? null,
      affected_area_rai: item.affected_area_rai ?? null,
      affected_farmers: item.affected_farmers ?? null,
      affected_households: item.affected_farmers ?? null,
      notes: item.notes || null,
    }));

    // Clear existing rows (if any)
    console.log('Clearing existing disasters records...');
    const { error: deleteError } = await supabase
      .from('disasters')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.log('Delete status/note:', deleteError);
    }

    // Insert in batches of 200 to prevent payload limit issues
    const batchSize = 200;
    let success = true;
    for (let i = 0; i < mappedDisasters.length; i += batchSize) {
      const batch = mappedDisasters.slice(i, i + batchSize);
      console.log(
        `Upserting batch ${i / batchSize + 1} (${batch.length} rows)...`
      );
      const { error: insertError } = await supabase
        .from('disasters')
        .upsert(batch, {
          onConflict: 'year,disaster_type,district,subdistrict,village_no',
        });
      if (insertError) {
        console.error(`Error upserting batch starting at ${i}:`, insertError);
        success = false;
        break;
      }
    }

    if (success) {
      console.log('Successfully seeded disasters!');
    }
  } else {
    console.log('Warning: disasters_by_village_seed.json not found.');
  }

  console.log('\nDatabase seeding complete!');
}

main().catch((error) => {
  console.error('Fatal error during seeding:', error);
  process.exit(1);
});
