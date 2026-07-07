'use strict';

const PUBLIC_TABLES = [
  'farmer_registry',
  'agricultural_areas',
  'learning_centers',
  'daily_weather',
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
  'farmer_institutes',
  'agri_tourism',
  'disasters',
  'forecast_plots',
  'ai_disease_forecasts',
  'pest_centers',
  'plant_doctors',
  'soil_fertilizer_centers',
  'soil_series',
  'fire_hotspots',
  'budgets',
  'personnel',
  'assets',
  'geoplots_parcel_progress',
  'geoplots_parcel_subdistrict_progress',
];

const DASHBOARD_ORIGIN = 'https://npt-dashboard.netlify.app';

const FARMER_GROUP_TYPES = {
  community_enterprise: {
    label: 'วิสาหกิจชุมชน',
    summaryColumn: 'community_enterprise_groups',
    route: '/dashboard/development/community-enterprises',
    tables: ['community_enterprises'],
  },
  housewife: {
    label: 'กลุ่มแม่บ้านเกษตรกร',
    summaryColumn: 'housewives_groups',
    route: '/dashboard/development/housewife-farmer-groups',
    tables: ['housewife_farmer_groups'],
  },
  young_farmer: {
    label: 'กลุ่มยุวเกษตรกร',
    summaryColumn: 'young_farmer_groups',
    route: '/dashboard/development/young-farmer-groups',
    tables: ['young_farmer_groups_detailed'],
  },
  career: {
    label: 'กลุ่มส่งเสริมอาชีพการเกษตร',
    summaryColumn: 'career_promotion_groups',
    route: '/dashboard/development/agricultural-career-groups',
    tables: ['agricultural_career_groups'],
  },
  all: {
    label: 'กลุ่มเกษตรกร',
    summaryColumn: 'total_groups',
    route: '/dashboard/development/farmer-institutes',
    tables: [
      'community_enterprises',
      'housewife_farmer_groups',
      'young_farmer_groups_detailed',
      'agricultural_career_groups',
    ],
  },
};

const AREA_TABLES = {
  community_enterprises: {
    label: 'วิสาหกิจชุมชน',
    route: '/dashboard/development/community-enterprises',
    select:
      'id,enterprise_name,enterprise_type,product_type,district,subdistrict,member_count,level',
    titleField: 'enterprise_name',
    yearColumn: null,
  },
  housewife_farmer_groups: {
    label: 'กลุ่มแม่บ้านเกษตรกร',
    route: '/dashboard/development/housewife-farmer-groups',
    select:
      'id,group_name,district,subdistrict,activity,member_count,potential_level,year',
    titleField: 'group_name',
    yearColumn: 'year',
  },
  young_farmer_groups_detailed: {
    label: 'กลุ่มยุวเกษตรกร',
    route: '/dashboard/development/young-farmer-groups',
    select:
      'id,group_name,district,subdistrict,activity,member_count,potential_level,data_year',
    titleField: 'group_name',
    yearColumn: 'data_year',
  },
  agricultural_career_groups: {
    label: 'กลุ่มส่งเสริมอาชีพการเกษตร',
    route: '/dashboard/development/agricultural-career-groups',
    select:
      'id,group_name,district,subdistrict,activity,main_activity,member_count,potential_level,data_year',
    titleField: 'group_name',
    yearColumn: 'data_year',
  },
};

function dashboardUrl(route) {
  return `${DASHBOARD_ORIGIN}${route || '/dashboard'}`;
}

function normalizeGroupType(value) {
  return FARMER_GROUP_TYPES[value] ? value : 'all';
}

function areaTablesFor(groupType, requestedTables = []) {
  const normalized = normalizeGroupType(groupType);
  const allowed = new Set(FARMER_GROUP_TYPES[normalized].tables);
  const requested = (requestedTables || []).filter(
    (table) => allowed.has(table) && AREA_TABLES[table]
  );
  return requested.length > 0 ? requested : [...allowed];
}

async function selectRows(supabase, table, select, filters = {}, options = {}) {
  let query = supabase.from(table).select(select);
  for (const [field, value] of Object.entries(filters)) {
    if (value != null && value !== '' && typeof query.eq === 'function') {
      query = query.eq(field, value);
    }
  }
  if (options.orderBy && typeof query.order === 'function') {
    query = query.order(options.orderBy, { ascending: false });
  }
  if (options.limit && typeof query.limit === 'function') {
    query = query.limit(options.limit);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getDistrictSummary(supabase, context, groupType) {
  const type = FARMER_GROUP_TYPES[normalizeGroupType(groupType)];
  const rows = await selectRows(
    supabase,
    'farmer_institutes',
    [
      'district',
      'total_groups',
      'community_enterprise_groups',
      'housewives_groups',
      'young_farmer_groups',
      'career_promotion_groups',
    ].join(','),
    context.district ? { district: context.district } : {}
  );

  const valueFor = (row) => Number(row[type.summaryColumn] || 0);
  if (context.areaScope === 'district_breakdown') {
    const breakdown = rows
      .map((row) => ({ district: row.district, count: valueFor(row) }))
      .sort((a, b) =>
        String(a.district).localeCompare(String(b.district), 'th')
      );
    return {
      coverage: 'district_breakdown',
      label: type.label,
      total: breakdown.reduce((sum, item) => sum + item.count, 0),
      breakdown,
      url: dashboardUrl(type.route),
    };
  }

  const total = rows.reduce((sum, row) => sum + valueFor(row), 0);
  return {
    coverage: context.district ? 'district' : 'province',
    label: type.label,
    district: context.district || null,
    total,
    url: dashboardUrl(type.route),
  };
}

function summarizeRows(rows, context, groupType, table = null) {
  const type = FARMER_GROUP_TYPES[normalizeGroupType(groupType)];
  if (context.areaScope === 'subdistrict_breakdown') {
    const counts = new Map();
    for (const row of rows) {
      if (!row.subdistrict) continue;
      counts.set(row.subdistrict, (counts.get(row.subdistrict) || 0) + 1);
    }
    const breakdown = [...counts]
      .map(([subdistrict, count]) => ({ subdistrict, count }))
      .sort((a, b) =>
        String(a.subdistrict).localeCompare(String(b.subdistrict), 'th')
      );
    return {
      coverage: 'subdistrict_breakdown',
      label: type.label,
      district: context.district || null,
      total: breakdown.reduce((sum, item) => sum + item.count, 0),
      breakdown,
      url: dashboardUrl(
        table
          ? AREA_TABLES[table]?.route
          : '/dashboard/development/farmer-institutes'
      ),
    };
  }

  return {
    coverage: 'subdistrict',
    label: type.label,
    district: context.district || null,
    subdistrict: context.subdistrict || null,
    total: rows.length,
    url: dashboardUrl(
      table
        ? AREA_TABLES[table]?.route
        : '/dashboard/development/farmer-institutes'
    ),
  };
}

async function fetchAreaRows(supabase, table, context) {
  const cfg = AREA_TABLES[table];
  const filters = {};
  if (context.district) filters.district = context.district;
  if (
    (context.areaScope === 'subdistrict' ||
      context.areaScope === 'subdistrict_breakdown') &&
    context.subdistrict
  ) {
    filters.subdistrict = context.subdistrict;
  }
  return selectRows(supabase, table, cfg.select, filters, {
    orderBy: cfg.yearColumn,
    limit: context.limit || 20,
  });
}

function formatAreaRecord(table, row) {
  const cfg = AREA_TABLES[table];
  return {
    ...row,
    title:
      row[cfg.titleField] || row.enterprise_name || row.group_name || 'ข้อมูล',
  };
}

const TOOL_RUNNERS = {
  async global_search(supabase, terms, tables) {
    const searchTerms = [
      ...new Set(
        (terms || [])
          .flatMap((term) => String(term || '').split(/[\s,]+/))
          .map((term) => term.trim())
          .filter((term) => term.length >= 2)
      ),
    ].slice(0, 5);
    const tableNames = [
      ...new Set(
        (tables || []).filter((table) => PUBLIC_TABLES.includes(table))
      ),
    ].slice(0, 3);

    if (tableNames.length === 0) return [];

    const { data, error } = await supabase.rpc('global_search_public', {
      search_terms: searchTerms,
      table_names: tableNames,
      result_limit: 3,
    });
    if (error) throw error;
    return data || [];
  },
  async personnel_summary(supabase, _terms, _tables, context = {}) {
    // ponytail: aggregate the small staff table here; move to an RPC if it grows enough to measure.
    const { data, error } = await supabase
      .from('personnel')
      .select('district,office_type,position')
      .neq('position', 'สำนักงาน');
    if (error) throw error;

    const people = (data || []).filter((row) => row.position !== 'สำนักงาน');
    const scope = context.personnelScope;
    if (scope === 'province') {
      return {
        scope,
        total: people.filter((row) => row.office_type === 'Provincial').length,
      };
    }
    if (scope === 'district') {
      if (!context.district) throw new Error('Personnel district is required');
      return {
        scope,
        district: context.district,
        total: people.filter(
          (row) =>
            row.office_type === 'District' && row.district === context.district
        ).length,
      };
    }
    if (scope === 'district_breakdown') {
      const counts = new Map();
      for (const row of people) {
        if (
          row.office_type === 'District' &&
          row.district &&
          row.district !== '-'
        ) {
          counts.set(row.district, (counts.get(row.district) || 0) + 1);
        }
      }
      const breakdown = [...counts]
        .map(([district, count]) => ({ district, count }))
        .sort((a, b) => a.district.localeCompare(b.district, 'th'));
      return {
        scope,
        total: breakdown.reduce((sum, item) => sum + item.count, 0),
        breakdown,
      };
    }
    if (scope === 'all') return { scope, total: people.length };
    throw new Error('Invalid personnel scope');
  },
  async area_summary(supabase, _terms, tables, context = {}) {
    const groupType = normalizeGroupType(context.farmerGroupType);
    if (
      context.areaScope === 'subdistrict' ||
      context.areaScope === 'subdistrict_breakdown'
    ) {
      const detailTables = areaTablesFor(groupType, tables);
      const rowsByTable = await Promise.all(
        detailTables.map(async (table) => ({
          table,
          rows: await fetchAreaRows(supabase, table, context),
        }))
      );
      const allRows = rowsByTable.flatMap((item) => item.rows);
      if (allRows.length > 0) {
        const primaryTable =
          rowsByTable.find((item) => item.rows.length > 0)?.table ||
          detailTables[0];
        return summarizeRows(allRows, context, groupType, primaryTable);
      }

      const fallback = await getDistrictSummary(supabase, context, groupType);
      return {
        ...fallback,
        coverage: 'district_fallback',
        requestedSubdistrict: context.subdistrict || null,
        reason: context.subdistrict
          ? `ไม่พบข้อมูลระดับตำบล ${context.subdistrict}`
          : 'ข้อมูลระดับตำบลไม่พอ',
      };
    }

    return getDistrictSummary(supabase, context, groupType);
  },
  async area_search(supabase, _terms, tables, context = {}) {
    const groupType = normalizeGroupType(context.farmerGroupType);
    const detailTables = areaTablesFor(groupType, tables);
    let coverage =
      context.areaScope === 'subdistrict' ? 'subdistrict' : 'district';
    let categories = await Promise.all(
      detailTables.map(async (table) => {
        const rows = await fetchAreaRows(supabase, table, context);
        const cfg = AREA_TABLES[table];
        return {
          table,
          label: cfg.label,
          totalCount: rows.length,
          url: dashboardUrl(cfg.route),
          results: rows.slice(0, 3).map((row) => formatAreaRecord(table, row)),
        };
      })
    );

    if (
      coverage === 'subdistrict' &&
      categories.every((cat) => cat.totalCount === 0)
    ) {
      coverage = 'district_fallback';
      const fallbackContext = {
        ...context,
        areaScope: 'district',
        subdistrict: null,
      };
      categories = await Promise.all(
        detailTables.map(async (table) => {
          const rows = await fetchAreaRows(supabase, table, fallbackContext);
          const cfg = AREA_TABLES[table];
          return {
            table,
            label: cfg.label,
            totalCount: rows.length,
            url: dashboardUrl(cfg.route),
            results: rows
              .slice(0, 3)
              .map((row) => formatAreaRecord(table, row)),
          };
        })
      );
    }

    const filteredCategories = categories.filter((cat) => cat.totalCount > 0);
    return {
      coverage,
      district: context.district || null,
      subdistrict:
        coverage === 'subdistrict' ? context.subdistrict || null : null,
      requestedSubdistrict:
        coverage === 'district_fallback' ? context.subdistrict || null : null,
      reason:
        coverage === 'district_fallback'
          ? `ไม่พบข้อมูลระดับตำบล ${context.subdistrict || ''}`.trim()
          : null,
      total: filteredCategories.reduce((sum, cat) => sum + cat.totalCount, 0),
      categories: filteredCategories,
    };
  },
  async disease_forecast(supabase, _terms, _tables, context = {}) {
    const { data, error } = await supabase
      .from('ai_disease_forecasts')
      .select('forecast_date,summary,details')
      .order('forecast_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    const crop = String(context.crop || '')
      .trim()
      .toLowerCase();
    const riskOrder = { สูง: 0, ปานกลาง: 1, ต่ำ: 2 };
    const risks = (Array.isArray(data?.details) ? data.details : [])
      .filter((item) => {
        if (!crop) return true;
        const target = String(item?.target_crop || '')
          .trim()
          .toLowerCase();
        return target.includes(crop) || crop.includes(target);
      })
      .sort(
        (a, b) =>
          (riskOrder[a.risk_level] ?? 3) - (riskOrder[b.risk_level] ?? 3)
      )
      .slice(0, 3)
      .map(
        ({ name, type, risk_level, description, prevention, target_crop }) => ({
          name,
          type,
          risk_level,
          description,
          prevention,
          target_crop,
        })
      );

    return {
      forecastDate: data?.forecast_date || null,
      summary: data?.summary || '',
      risks,
      district: context.district || null,
      scope: 'province',
    };
  },
  async latest_weather(supabase) {
    const { data, error } = await supabase
      .from('daily_weather')
      .select('*')
      .order('date', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data || [];
  },
  async fire_hotspots(supabase) {
    const { data, error } = await supabase
      .from('fire_hotspots')
      .select('*')
      .order('acq_date', { ascending: false })
      .order('acq_time', { ascending: false })
      .limit(5);
    if (error) throw error;
    return data || [];
  },
};

async function executeTools(supabase, names, terms, tables, context) {
  for (const name of names) {
    if (!TOOL_RUNNERS[name]) {
      throw new Error(`Tool not allowed: ${name}`);
    }
  }
  return Promise.all(
    names.map(async (name) => ({
      tool: name,
      data: await TOOL_RUNNERS[name](supabase, terms, tables, context),
    }))
  );
}

export { executeTools, PUBLIC_TABLES };
