'use strict';

const PUBLIC_TABLES = [
  'farmer_registry',
  'agricultural_areas',
  'learning_centers',
  'daily_weather',
  'large_plots',
  'certifications',
  'crop_production',
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
  'fire_hotspots',
  'budgets',
  'personnel',
];
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

    if (searchTerms.length === 0 || tableNames.length === 0) return [];

    const { data, error } = await supabase.rpc('global_search_public', {
      search_terms: searchTerms,
      table_names: tableNames,
      result_limit: 3,
    });
    if (error) throw error;
    return data || [];
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
        const target = String(item?.target_crop || '')
          .trim()
          .toLowerCase();
        return crop && (target.includes(crop) || crop.includes(target));
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

module.exports = { executeTools, PUBLIC_TABLES };
