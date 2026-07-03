import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase env for public-certifications.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const fetchAllCertifications = async () => {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('certifications')
      .select(
        'id,crop_name,plot_type,area_rai,production_volume_kg,cert_date,exp_date,plot_moo,plot_subdistrict,plot_district,farmer_moo,farmer_subdistrict,farmer_district,created_at'
      )
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
};

export default async () => {
  try {
    const { count, error: countError } = await supabase
      .from('certifications')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    const data = await fetchAllCertifications();

    const rows = (data || []).map((row) => ({
      ...row,
      farmer_name: null,
      plot_code: null,
      farmer_key: row.id ? `cert-${row.id}` : null,
    }));

    return new Response(JSON.stringify({ data: rows, count: count || 0 }), {
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
  path: '/api/public-certifications',
};
