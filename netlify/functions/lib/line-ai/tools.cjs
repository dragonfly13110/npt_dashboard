'use strict';

const TOOL_RUNNERS = {
  async global_search(supabase, terms) {
    const { data, error } = await supabase.rpc('global_search', {
      search_term: terms.join(' '),
      result_limit: 3,
    });
    if (error) throw error;
    return data || [];
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

async function executeTools(supabase, names, terms) {
  for (const name of names) {
    if (!TOOL_RUNNERS[name]) {
      throw new Error(`Tool not allowed: ${name}`);
    }
  }
  return Promise.all(
    names.map(async (name) => ({
      tool: name,
      data: await TOOL_RUNNERS[name](supabase, terms),
    }))
  );
}

module.exports = { executeTools };
