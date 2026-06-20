'use strict';

const TOOL_RUNNERS = {
  async global_search(supabase, terms) {
    if (!terms || terms.length === 0) return [];

    // Split terms by space or comma and extract clean, unique keywords of length >= 2
    const keywords = [];
    for (const rawTerm of terms) {
      if (!rawTerm) continue;
      const parts = String(rawTerm).split(/[\s,]+/);
      for (const part of parts) {
        const cleaned = part.trim();
        if (cleaned.length >= 2 && !keywords.includes(cleaned)) {
          keywords.push(cleaned);
        }
      }
    }

    if (keywords.length === 0) return [];

    // Run searches in parallel
    const searchPromises = keywords.map(async (kw) => {
      const { data, error } = await supabase.rpc('global_search', {
        search_term: kw,
        result_limit: 10,
      });
      if (error) {
        console.error(`Error in global_search RPC for keyword "${kw}":`, error);
        return [];
      }
      return data || [];
    });

    const resultsArray = await Promise.all(searchPromises);

    // Merge and count matches
    const mergedMap = new Map(); // table -> { table, totalCount, resultsMap: id -> { row, matchCount } }

    for (const categoryList of resultsArray) {
      for (const cat of categoryList) {
        const table = cat.table;
        if (!mergedMap.has(table)) {
          mergedMap.set(table, {
            table,
            totalCount: 0,
            resultsMap: new Map(),
          });
        }
        const mergedCat = mergedMap.get(table);

        for (const row of cat.results || []) {
          if (!mergedCat.resultsMap.has(row.id)) {
            mergedCat.resultsMap.set(row.id, { row, matchCount: 1 });
          } else {
            mergedCat.resultsMap.get(row.id).matchCount += 1;
          }
        }

        mergedCat.totalCount = Math.max(
          mergedCat.totalCount,
          cat.totalCount || 0
        );
      }
    }

    // Convert back and sort by matchCount descending
    const mergedResults = [];
    for (const [table, mergedCat] of mergedMap.entries()) {
      const sortedResults = Array.from(mergedCat.resultsMap.values())
        .sort((a, b) => b.matchCount - a.matchCount)
        .map((item) => item.row)
        .slice(0, 10);
      const totalCount = Math.max(mergedCat.totalCount, sortedResults.length);
      mergedResults.push({
        table,
        totalCount,
        results: sortedResults,
      });
    }

    return mergedResults;
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
