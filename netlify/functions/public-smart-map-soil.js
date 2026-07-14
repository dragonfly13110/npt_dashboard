import { createClient } from '@supabase/supabase-js';
import { corsHeaders, isOriginAllowed } from './lib/http-security.js';
import { toSoilFeatureCollection } from './lib/smart-map/soil-builders.js';

const SOIL_SELECT =
  'id,soil_series_name,soil_series_code,soil_group,texture,fertility,ph_top,district,area_rai,geometry,updated_at';

function getEnv(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || '';
}

function response(origin, status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin, { methods: 'GET, OPTIONS' }),
    },
  });
}

function parseLimit(value) {
  const limit = Number(value || 2000);
  if (!Number.isInteger(limit) || limit < 1 || limit > 2000) {
    throw new Error('limit must be an integer from 1 to 2000');
  }
  return limit;
}

function parseBbox(value) {
  if (!value) return null;
  const [minLon, minLat, maxLon, maxLat] = value.split(',').map(Number);
  if (
    ![minLon, minLat, maxLon, maxLat].every(Number.isFinite) ||
    minLon >= maxLon ||
    minLat >= maxLat
  ) {
    throw new Error('bbox must be minLon,minLat,maxLon,maxLat');
  }
  return { minLon, minLat, maxLon, maxLat };
}

export default async (request) => {
  const origin = request.headers.get('origin') || '';
  if (request.method === 'OPTIONS')
    return new Response('', {
      status: 204,
      headers: corsHeaders(origin, { methods: 'GET, OPTIONS' }),
    });
  if (request.method !== 'GET')
    return response(origin, 405, { error: 'Method not allowed' });
  if (!isOriginAllowed(origin))
    return response(origin, 403, { error: 'Origin not allowed' });

  let url;
  let limit;
  let bbox;
  try {
    url = new URL(request.url);
    limit = parseLimit(url.searchParams.get('limit'));
    bbox = parseBbox(url.searchParams.get('bbox'));
  } catch (error) {
    return response(origin, 400, { error: error.message });
  }

  try {
    const supabaseUrl = getEnv('VITE_SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey)
      throw new Error('Missing Supabase service configuration');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let query = supabase
      .from('soil_series')
      .select(SOIL_SELECT, { count: 'exact' })
      .limit(limit);
    if (url.searchParams.get('district'))
      query = query.eq('district', url.searchParams.get('district'));
    if (url.searchParams.get('soilGroup'))
      query = query.eq('soil_group', url.searchParams.get('soilGroup'));
    // ponytail: 53 polygons fit comfortably in memory; use PostGIS bounds when this layer grows.
    const { data, error, count } = await query;
    if (error) throw error;
    const collection = toSoilFeatureCollection(data || [], bbox);
    collection.meta.truncated = (count || 0) > limit;
    collection.meta.source = 'Land Development Department (LDD), Thailand';
    collection.meta.updatedAt = (data || []).reduce(
      (latest, row) =>
        latest > (row.updated_at || '') ? latest : row.updated_at || latest,
      null
    );
    return new Response(JSON.stringify(collection), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=900',
        ...corsHeaders(origin, { methods: 'GET, OPTIONS' }),
      },
    });
  } catch (error) {
    return response(origin, 500, { error: error.message });
  }
};

export const config = { path: '/api/public-smart-map-soil' };
