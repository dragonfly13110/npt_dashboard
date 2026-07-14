import { createClient } from '@supabase/supabase-js';
import { corsHeaders, isOriginAllowed } from './lib/http-security.js';
import {
  buildSmartMapSummary,
  parseSummaryScope,
} from './lib/smart-map/summary-builders.js';

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

function dateParam(value, name) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${name} must be YYYY-MM-DD`);
  }
  return value;
}

async function fetchRows(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function loadSummaryData(supabase, searchParams) {
  const hotspotFrom = dateParam(searchParams.get('hotspotFrom'), 'hotspotFrom');
  const hotspotTo = dateParam(searchParams.get('hotspotTo'), 'hotspotTo');
  let hotspots = supabase
    .from('fire_hotspots')
    .select('district,subdistrict,acq_date,created_at');
  if (hotspotFrom) hotspots = hotspots.gte('acq_date', hotspotFrom);
  if (hotspotTo) hotspots = hotspots.lte('acq_date', hotspotTo);

  const [
    agriculturalAreas,
    farmerRegistry,
    communityEnterprises,
    largePlots,
    smartFarmers,
    youngSmartFarmers,
    geoplotsDistrict,
    geoplotsSubdistrict,
    youngFarmerGroups,
    careerGroups,
    housewifeGroups,
    fireHotspots,
  ] = await Promise.all([
    fetchRows(
      supabase
        .from('agricultural_areas')
        .select('district,total_area_rai,farmer_households,created_at')
    ),
    fetchRows(
      supabase
        .from('farmer_registry_subdistricts')
        .select(
          'district,subdistrict,farm_area_rai,net_total_households,cutoff_date,created_at'
        )
    ),
    fetchRows(
      supabase
        .from('community_enterprises')
        .select('district,subdistrict,created_at')
    ),
    fetchRows(
      supabase.from('large_plots').select('district,subdistrict,created_at')
    ),
    fetchRows(supabase.from('smart_farmer_sf').select('district,created_at')),
    fetchRows(
      supabase
        .from('young_smart_farmer_ysf')
        .select('district,subdistrict,created_at')
    ),
    fetchRows(
      supabase
        .from('geoplots_parcel_progress')
        .select('district,drawn_plots,target_plots,snapshot_date,updated_at')
    ),
    fetchRows(
      supabase
        .from('geoplots_parcel_subdistrict_progress')
        .select(
          'district,subdistrict,drawn_plots,target_plots,snapshot_date,updated_at'
        )
    ),
    fetchRows(
      supabase
        .from('young_farmer_groups_detailed')
        .select('district,subdistrict,updated_at')
    ),
    fetchRows(
      supabase
        .from('agricultural_career_groups')
        .select('district,subdistrict,updated_at')
    ),
    fetchRows(
      supabase
        .from('housewife_farmer_groups')
        .select('district,subdistrict,updated_at')
    ),
    fetchRows(hotspots),
  ]);
  return {
    agriculturalAreas,
    farmerRegistry,
    communityEnterprises,
    largePlots,
    smartFarmers,
    youngSmartFarmers,
    geoplotsDistrict,
    geoplotsSubdistrict,
    youngFarmerGroups,
    careerGroups,
    housewifeGroups,
    fireHotspots,
  };
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

  let url;
  let scope;
  try {
    url = new URL(request.url);
    scope = parseSummaryScope(url.searchParams);
    dateParam(url.searchParams.get('hotspotFrom'), 'hotspotFrom');
    dateParam(url.searchParams.get('hotspotTo'), 'hotspotTo');
  } catch (error) {
    return response(origin, 400, { error: error.message });
  }

  try {
    const supabaseUrl = getEnv('VITE_SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase service configuration');
    }
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const summary = buildSmartMapSummary(
      scope,
      await loadSummaryData(supabase, url.searchParams)
    );
    return new Response(JSON.stringify(summary), {
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

export const config = { path: '/api/public-smart-map-summary' };
