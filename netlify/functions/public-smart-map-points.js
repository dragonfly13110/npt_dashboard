import { createClient } from '@supabase/supabase-js';
import { corsHeaders, isOriginAllowed } from './lib/http-security.js';
import { toPointFeatureCollection } from './lib/smart-map/feature-builders.js';
import { getPointLayerPolicy } from './lib/smart-map/layer-policy.js';

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
  const limit = Number(value || 1000);
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new Error('limit must be an integer from 1 to 1000');
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
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 204,
      headers: corsHeaders(origin, { methods: 'GET, OPTIONS' }),
    });
  }
  if (request.method !== 'GET')
    return response(origin, 405, { error: 'Method not allowed' });
  if (!isOriginAllowed(origin))
    return response(origin, 403, { error: 'Origin not allowed' });

  let policy;
  let limit;
  let bbox;
  let url;
  try {
    url = new URL(request.url);
    policy = getPointLayerPolicy(url.searchParams.get('layer'));
    if (!policy) throw new Error('Unknown point layer');
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
    const queryFields = [
      ...policy.publicFields,
      policy.coordinateJsonField,
    ].filter(Boolean);
    let query = supabase
      .from(policy.sourceTable)
      .select(queryFields.join(','), { count: 'exact' })
      .limit(limit);
    if (url.searchParams.get('district'))
      query = query.eq('district', url.searchParams.get('district'));
    if (url.searchParams.get('subdistrict'))
      query = query.eq('subdistrict', url.searchParams.get('subdistrict'));
    if (
      bbox &&
      policy.coordinateType === 'lat_lon' &&
      !policy.coordinateJsonField
    ) {
      query = query
        .gte(policy.latitudeField, bbox.minLat)
        .lte(policy.latitudeField, bbox.maxLat)
        .gte(policy.longitudeField, bbox.minLon)
        .lte(policy.longitudeField, bbox.maxLon);
    }
    // ponytail: UTM rows are small today; add stored WGS84 columns if forecast plots grow.
    const { data, error, count } = await query;
    if (error) throw error;
    const collection = toPointFeatureCollection(policy, data || [], bbox);
    collection.meta.truncated = (count || 0) > limit;
    return new Response(JSON.stringify(collection), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=120',
        ...corsHeaders(origin, { methods: 'GET, OPTIONS' }),
      },
    });
  } catch (error) {
    return response(origin, 500, { error: error.message });
  }
};

export const config = { path: '/api/public-smart-map-points' };
