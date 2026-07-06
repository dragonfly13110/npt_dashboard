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
  'farmer_groups',
  'housewife_farmer_groups',
  'young_farmer_groups',
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

  if (request.method !== 'GET' && request.method !== 'POST') {
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
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return jsonResponse(origin, 401, {
        error: 'Missing authorization token',
      });
    }

    const {
      data: { user: requester },
      error: requesterError,
    } = await supabase.auth.getUser(token);

    if (requesterError || !requester) {
      return jsonResponse(origin, 401, {
        error: 'Invalid authorization token',
      });
    }

    // Verify requester has admin role
    const { data: requesterProfile, error: requesterProfileError } =
      await supabase
        .from('profiles')
        .select('role')
        .eq('id', requester.id)
        .single();

    if (requesterProfileError || requesterProfile?.role !== 'admin') {
      return jsonResponse(origin, 403, {
        error: 'Only admins can access data quality stats',
      });
    }

    // Fetch column metadata for target tables
    const { data: columns, error: columnsError } = await supabase.rpc(
      'get_table_columns_metadata',
      {},
      {
        // If the RPC doesn't exist, we will query via standard information_schema
      }
    );

    // Fallback: Query columns using SQL
    let tableColumns = [];
    if (columnsError || !columns) {
      // We can fetch columns via a direct query
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/execute_sql_query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            apikey: SUPABASE_SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({
            query: `
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name IN (${TARGET_TABLES.map((t) => `'${t}'`).join(',')})
          `,
          }),
        }
      );
      if (response.ok) {
        tableColumns = await response.json();
      }
    } else {
      tableColumns = columns;
    }

    const stats = [];

    // Group columns by table
    const columnsMap = tableColumns.reduce((acc, col) => {
      acc[col.table_name] = acc[col.table_name] || [];
      acc[col.table_name].push(col.column_name);
      return acc;
    }, {});

    for (const tableName of TARGET_TABLES) {
      const cols = columnsMap[tableName] || [];
      if (!cols.length) continue;

      // Filter out meta columns for null & duplicate checks
      const dataCols = cols.filter(
        (c) =>
          c !== 'id' &&
          c !== 'created_at' &&
          c !== 'updated_at' &&
          c !== 'custom_fields'
      );

      if (!dataCols.length) continue;

      const hasUpdatedAt = cols.includes('updated_at');
      const hasCreatedAt = cols.includes('created_at');
      const lastUpdatedExpr =
        hasUpdatedAt && hasCreatedAt
          ? 'COALESCE(MAX(updated_at), MAX(created_at))'
          : hasUpdatedAt
            ? 'MAX(updated_at)'
            : hasCreatedAt
              ? 'MAX(created_at)'
              : 'NULL::timestamp with time zone';

      // Construct a query to get row count, null count, and last updated
      const nullChecks = dataCols.map((c) => `(${c} IS NULL)::int`).join(' + ');
      const query = `
        SELECT 
          COUNT(*)::int AS total_rows,
          ${lastUpdatedExpr} AS last_updated,
          SUM(${nullChecks})::int AS null_cells_count
        FROM public.${tableName}
      `;

      // Construct query for distinct count to calculate duplicates
      const distinctQuery = `
        SELECT COUNT(*)::int AS distinct_rows 
        FROM (SELECT DISTINCT ${dataCols.join(', ')} FROM public.${tableName}) AS temp
      `;

      try {
        const fetchSql = async (sql) => {
          const res = await fetch(
            `${SUPABASE_URL}/rest/v1/rpc/execute_sql_query`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                apikey: SUPABASE_SERVICE_ROLE_KEY,
              },
              body: JSON.stringify({ query: sql }),
            }
          );
          if (!res.ok) throw new Error(`Query failed: ${await res.text()}`);
          return res.json();
        };

        const [metaResult, distinctResult] = await Promise.all([
          fetchSql(query),
          fetchSql(distinctQuery),
        ]);

        const totalRows = metaResult[0]?.total_rows || 0;
        const lastUpdated = metaResult[0]?.last_updated || null;
        const nullCellsCount = metaResult[0]?.null_cells_count || 0;
        const distinctRows = distinctResult[0]?.distinct_rows || 0;

        const duplicateCount = totalRows > 0 ? totalRows - distinctRows : 0;
        const totalCells = totalRows * dataCols.length;
        const completeness =
          totalCells > 0
            ? ((totalCells - nullCellsCount) / totalCells) * 100
            : 100;

        stats.push({
          tableName,
          totalRows,
          lastUpdated,
          nullCellsCount,
          totalCells,
          completeness: parseFloat(completeness.toFixed(2)),
          duplicateCount: duplicateCount < 0 ? 0 : duplicateCount, // handle potential PG boundary edge-cases
        });
      } catch (err) {
        console.error(`Error querying stats for ${tableName}:`, err.message);
        stats.push({
          tableName,
          error: err.message,
        });
      }
    }

    return jsonResponse(origin, 200, { stats });
  } catch (err) {
    console.error('Data quality stats error:', err);
    return jsonResponse(origin, 500, {
      error: err.message || 'Internal Server Error',
    });
  }
};

export const config = {
  path: '/api/admin/data-quality-stats',
};
