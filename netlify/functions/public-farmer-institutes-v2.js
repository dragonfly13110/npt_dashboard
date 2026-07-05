import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase env for public-farmer-institutes-v2.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchRows() {
  const [
    smartFarmers,
    youngSmartFarmers,
    housewifeGroups,
    youngFarmerGroups,
    careerGroups,
  ] = await Promise.all([
    supabase
      .from('smart_farmer_sf')
      .select(
        'id,data_year,record_code,sequence_no,district,agricultural_activity,production_standard,farmer_status,production_area'
      )
      .order('data_year', { ascending: false }),
    supabase
      .from('young_smart_farmer_ysf')
      .select(
        'id,data_year,record_code,sequence_no,district,agricultural_activity,production_standard,farmer_status,farm_area_rai,main_activity_type'
      )
      .order('data_year', { ascending: false }),
    supabase
      .from('housewife_farmer_groups')
      .select(
        'id,year,group_name,district,subdistrict,member_count,income,fund_management,activity,production_standard,potential_level,model_group,community_enterprise_registration'
      )
      .order('year', { ascending: false }),
    supabase
      .from('young_farmer_groups_detailed')
      .select(
        'id,data_year,group_name,district,subdistrict,member_count,income,fund_management,activity,potential_level,model_group'
      )
      .order('data_year', { ascending: false }),
    supabase
      .from('agricultural_career_groups')
      .select(
        'id,data_year,group_name,district,subdistrict,member_count,income,fund_management,activity,main_activity,production_standard,potential_level,community_enterprise_registration'
      )
      .order('data_year', { ascending: false }),
  ]);

  const failures = [
    smartFarmers,
    youngSmartFarmers,
    housewifeGroups,
    youngFarmerGroups,
    careerGroups,
  ]
    .filter((result) => result.error)
    .map((result) => result.error.message);
  if (failures.length) throw new Error(failures.join(', '));

  return {
    smartFarmers: smartFarmers.data || [],
    youngSmartFarmers: youngSmartFarmers.data || [],
    housewifeGroups: housewifeGroups.data || [],
    youngFarmerGroups: youngFarmerGroups.data || [],
    careerGroups: careerGroups.data || [],
  };
}

export default async () => {
  try {
    const payload = await fetchRows();
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = {
  path: '/api/public-farmer-institutes-v2',
};
