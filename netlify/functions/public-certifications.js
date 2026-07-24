import { createClient } from '@supabase/supabase-js';
import { corsHeaders, isOriginAllowed } from './lib/http-security.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase env for public-certifications.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SELECT_COLUMNS =
  'id,crop_name,plot_type,area_rai,production_volume_kg,cert_date,exp_date,plot_moo,plot_subdistrict,plot_district,farmer_moo,farmer_subdistrict,farmer_district,created_at';
const SORT_COLUMNS = new Set([
  'created_at',
  'crop_name',
  'plot_district',
  'area_rai',
  'production_volume_kg',
]);

export function pageValue(value, fallback, maximum) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, 1), maximum)
    : fallback;
}

export function applyFilters(query, params) {
  const search = params.get('search')?.trim();
  if (search) query = query.ilike('crop_name', `%${search}%`);
  for (const field of ['crop_name', 'plot_district', 'plot_subdistrict']) {
    const value = params.get(field)?.trim();
    if (value) query = query.eq(field, value);
  }
  for (const field of ['cert_date', 'exp_date']) {
    const year = params.get(field)?.trim();
    if (year) query = query.ilike(field, `%/${year}`);
  }
  return query;
}

export default async (request) => {
  const origin = request.headers.get('origin') || '';
  const baseHeaders = corsHeaders(origin, { methods: 'GET, OPTIONS' });
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: baseHeaders });
  }
  if (!isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...baseHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const params = new URL(request.url).searchParams;
    const countOnly = params.get('count') === '1';
    let countQuery = supabase
      .from('certifications')
      .select('id', { count: 'exact', head: true });
    countQuery = applyFilters(countQuery, params);
    const { count, error: countError } = await countQuery;

    if (countError) throw countError;

    if (countOnly) {
      return new Response(JSON.stringify({ count: count || 0 }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...baseHeaders,
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    const page = pageValue(params.get('page'), 1, 1_000_000);
    const pageSize = pageValue(params.get('pageSize'), 25, 100);
    const sort = SORT_COLUMNS.has(params.get('sort'))
      ? params.get('sort')
      : 'created_at';
    const ascending = params.get('order') === 'asc';
    let query = supabase
      .from('certifications')
      .select(SELECT_COLUMNS)
      .order(sort, { ascending });
    query = applyFilters(query, params).range(
      (page - 1) * pageSize,
      page * pageSize - 1
    );
    const { data, error } = await query;
    if (error) throw error;

    return new Response(
      JSON.stringify({ data: data || [], count: count || 0 }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...baseHeaders,
          'Cache-Control': 'public, max-age=300',
        },
      }
    );
  } catch (err) {
    console.error('public-certifications failed', err);
    return new Response(
      JSON.stringify({ error: 'Public data is unavailable' }),
      {
        status: 500,
        headers: { ...baseHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

export const config = {
  path: '/api/public-certifications',
};
