import { createClient } from '@supabase/supabase-js';
import { corsHeaders, isOriginAllowed } from './lib/http-security.js';

function jsonResponse(origin, status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(origin, { headers: 'Authorization, Content-Type' }),
      'Content-Type': 'application/json',
    },
  });
}

const TARGET_TABLES = [
  'farmer_registry',
  'agricultural_areas',
  'learning_centers',
  'gis_areas',
  'disasters',
  'large_plots',
  'certifications',
  'crop_production',
  'production_costs',
  'community_enterprises',
  'smart_farmers',
  'smart_farmer_sf',
  'young_smart_farmer_ysf',
  'agricultural_career_groups',
  'housewife_farmer_groups',
  'young_farmer_groups_detailed',
  'agri_tourism',
  'forecast_plots',
  'pest_outbreaks',
  'pest_centers',
  'plant_doctors',
  'soil_fertilizer_centers',
  'soil_series',
  'fire_hotspots',
  'ai_disease_forecasts',
  'budgets',
  'personnel',
];

export default async (request) => {
  const origin = request.headers.get('origin');
  if (!isOriginAllowed(origin)) {
    return jsonResponse(origin, 403, { error: 'Origin not allowed' });
  }

  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 204,
      headers: corsHeaders(origin, {
        headers: 'Authorization, Content-Type',
      }),
    });
  }

  if (request.method !== 'GET') {
    return jsonResponse(origin, 405, { error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(origin, 500, {
      error: 'Missing Supabase service configuration.',
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Auth token is optional since Data Dictionary metadata is a public resource.
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token) {
      // Validate token if provided, but do not block the request if it is invalid or absent.
      await supabase.auth.getUser(token).catch((err) => {
        console.error('Optional auth token check failed:', err);
      });
    }

    // Run query to get row counts for all tables using UNION ALL
    const countSql = TARGET_TABLES.map(
      (t) =>
        `SELECT '${t}'::text AS table_name, COUNT(*)::int AS row_count FROM public.${t}`
    ).join(' UNION ALL ');

    // Run query to get column metadata
    const columnsSql = `
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name IN (${TARGET_TABLES.map((t) => `'${t}'`).join(',')})
    `;

    const fetchSql = async (sql) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql_query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ query: sql }),
      });
      if (!res.ok) throw new Error(`Query failed: ${await res.text()}`);
      return res.json();
    };

    const [countsResult, columnsResult] = await Promise.all([
      fetchSql(countSql).catch((err) => {
        console.error('Error fetching table counts:', err);
        return [];
      }),
      fetchSql(columnsSql).catch((err) => {
        console.error('Error fetching columns:', err);
        return [];
      }),
    ]);

    // Format output
    const rowCountsMap = countsResult.reduce((acc, r) => {
      acc[r.table_name] = r.row_count;
      return acc;
    }, {});

    const columnsMap = columnsResult.reduce((acc, col) => {
      acc[col.table_name] = acc[col.table_name] || [];
      acc[col.table_name].push({
        columnName: col.column_name,
        dataType: col.data_type,
      });
      return acc;
    }, {});

    const dictionary = TARGET_TABLES.map((tableName) => ({
      tableName,
      rowCount:
        rowCountsMap[tableName] !== undefined ? rowCountsMap[tableName] : null,
      columns: columnsMap[tableName] || [],
    }));

    return jsonResponse(origin, 200, { dictionary });
  } catch (err) {
    console.error('Data dictionary fetch error:', err);
    return jsonResponse(origin, 500, {
      error: err.message || 'Internal Server Error',
    });
  }
};

export const config = {
  path: '/api/data-dictionary',
};
