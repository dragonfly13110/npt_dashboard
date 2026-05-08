import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cjjirwqoovypymndhvwt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async () => {
    try {
        const { data, error } = await supabase
            .from('certifications')
            .select('id,crop_name,plot_type,area_rai,production_volume_kg,cert_date,exp_date,plot_moo,plot_subdistrict,plot_district,farmer_moo,farmer_subdistrict,farmer_district,created_at')
            .order('id', { ascending: true });

        if (error) throw error;

        const rows = (data || []).map(row => ({
            ...row,
            farmer_name: null,
            plot_code: null,
            farmer_key: row.id ? `cert-${row.id}` : null,
        }));

        return new Response(JSON.stringify({ data: rows }), {
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
