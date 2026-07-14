import { createClient } from '@supabase/supabase-js';
import { corsHeaders, isOriginAllowed } from './lib/http-security.js';
import { toPointFeatureCollection } from './lib/smart-map/feature-builders.js';
import { summarizeLayerStatus } from './lib/smart-map/layer-status.js';
import { SMART_MAP_LAYERS } from '../../src/features/smart-map/config/layerCatalog.js';

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

async function fetchAllRows(supabase, table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

function latestCreatedAt(rows) {
  return (
    rows
      .map((row) => row.created_at)
      .filter(Boolean)
      .sort()
      .at(-1) || null
  );
}

async function statusForLayer(supabase, layer) {
  const coordinateFields =
    layer.geometryType === 'point'
      ? layer.coordinateJsonField
        ? `,${layer.coordinateJsonField}`
        : `,${layer.latitudeField},${layer.longitudeField}`
      : '';
  const rows = await fetchAllRows(
    supabase,
    layer.sourceTable,
    `id,created_at${coordinateFields}`
  );
  if (layer.geometryType !== 'point') {
    return summarizeLayerStatus(layer, {
      totalRows: rows.length,
      updatedAt: latestCreatedAt(rows),
    });
  }
  const { meta } = toPointFeatureCollection(layer, rows);
  return summarizeLayerStatus(layer, {
    totalRows: rows.length,
    ...meta,
    updatedAt: latestCreatedAt(rows),
  });
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

  try {
    const supabaseUrl = getEnv('VITE_SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey)
      throw new Error('Missing Supabase service configuration');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return response(origin, 200, {
      layers: await Promise.all(
        SMART_MAP_LAYERS.map((layer) => statusForLayer(supabase, layer))
      ),
    });
  } catch (error) {
    return response(origin, 500, { error: error.message });
  }
};

export const config = { path: '/api/public-smart-map-layer-status' };
