import { supabase } from '../supabaseClient';
import { getNumericColumns, getSearchColumns } from '../domain/datasetCatalog';
import { parseBudgetNotes } from './chatbotBudgetService';

export function summarizeLocalRows(table, rows, distCol) {
  const numCols = getNumericColumns(table);
  if (!numCols?.length || !rows?.length) return null;

  const stats = {
    total_rows: rows.length,
    totals: {},
    averages: {},
    by_district: {},
  };
  numCols.forEach((col) => {
    stats.totals[col] = 0;
    stats.averages[col] = 0;
  });

  rows.forEach((row) => {
    const district = row[distCol] || row.crop_name || 'ไม่ระบุ';
    if (!stats.by_district[district]) {
      stats.by_district[district] = { count: 0 };
      numCols.forEach((col) => {
        stats.by_district[district][col] = 0;
      });
    }
    stats.by_district[district].count++;
    numCols.forEach((col) => {
      const value = Number(row[col]) || 0;
      stats.totals[col] += value;
      stats.by_district[district][col] += value;
    });
  });

  numCols.forEach((col) => {
    stats.averages[col] =
      Math.round((stats.totals[col] / rows.length) * 100) / 100;
  });
  stats.district_percentages = {};
  Object.entries(stats.by_district).forEach(([district, item]) => {
    stats.district_percentages[district] = { count: item.count };
    numCols.forEach((col) => {
      stats.district_percentages[district][col] =
        stats.totals[col] > 0
          ? Math.round((item[col] / stats.totals[col]) * 10000) / 100
          : 0;
    });
  });
  stats.rankings = {};
  numCols.slice(0, 5).forEach((col) => {
    const sorted = Object.entries(stats.by_district)
      .map(([district, item]) => ({ district, value: item[col] }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
    if (sorted.length) {
      stats.rankings[col] = {
        top: sorted[0],
        bottom: sorted[sorted.length - 1],
      };
    }
  });
  return stats;
}
/**
 * Compute server-side aggregation stats for numeric columns via Supabase
 * This prevents sending thousands of raw rows and lets AI use pre-computed numbers
 */
export async function computeAggregation(
  table,
  distCol,
  matchedDistrict,
  searchKeyword
) {
  const numCols = getNumericColumns(table);
  if (!numCols || numCols.length === 0) return null;

  try {
    // Build a select string that computes SUM for each numeric column
    // We do this by fetching all rows for the relevant columns and aggregating client-side
    // (Supabase REST API doesn't support SQL aggregation directly)
    let query = supabase.from(table).select([distCol, ...numCols].join(','));

    if (matchedDistrict) {
      query = query.ilike(distCol, `%${matchedDistrict}%`);
    }

    const searchCols = getSearchColumns(table);
    if (searchKeyword && searchCols.length > 0) {
      const cols = searchCols;
      const orString = cols
        .map((c) => `${c}.ilike.%${searchKeyword}%`)
        .join(',');
      query = query.or(orString);
      if (
        searchKeyword.includes('กล้วย') &&
        !searchKeyword.includes('กล้วยไม้')
      ) {
        cols.forEach((c) => {
          query = query.not(c, 'ilike', '%กล้วยไม้%');
        });
      }
    }

    const { data, error } = await query.limit(10000);
    if (error) {
      console.error(
        `[Aggregation Error] table=${table} district=${matchedDistrict} keyword=${searchKeyword}:`,
        error
      );
    }
    if (data && data.length === 0) {
      console.warn(
        `[Aggregation Empty] table=${table} district=${matchedDistrict} keyword=${searchKeyword}`
      );
    }
    if (error || !data || data.length === 0) return null;

    // Compute aggregation
    const stats = {
      total_rows: data.length,
      totals: {},
      averages: {},
      by_district: {},
    };

    // Initialize
    numCols.forEach((col) => {
      stats.totals[col] = 0;
      stats.averages[col] = 0;
    });

    // Process rows
    data.forEach((row) => {
      const budgetNotes =
        table === 'budgets' ? parseBudgetNotes(row.notes) : null;
      const district = budgetNotes?.district || row[distCol] || 'ไม่ระบุ';
      if (!stats.by_district[district]) {
        stats.by_district[district] = { count: 0 };
        numCols.forEach((col) => {
          stats.by_district[district][col] = 0;
        });
      }
      stats.by_district[district].count++;

      numCols.forEach((col) => {
        const val = parseFloat(row[col]) || 0;
        stats.totals[col] += val;
        stats.by_district[district][col] += val;
      });
    });

    // Compute averages
    numCols.forEach((col) => {
      stats.averages[col] =
        data.length > 0
          ? Math.round((stats.totals[col] / data.length) * 100) / 100
          : 0;
    });

    // Compute percentages per district
    stats.district_percentages = {};
    Object.entries(stats.by_district).forEach(([dist, distData]) => {
      stats.district_percentages[dist] = { count: distData.count };
      numCols.forEach((col) => {
        const total = stats.totals[col];
        stats.district_percentages[dist][col] =
          total > 0 ? Math.round((distData[col] / total) * 10000) / 100 : 0;
      });
    });

    // Find top/bottom for key metrics
    stats.rankings = {};
    numCols.slice(0, 5).forEach((col) => {
      const sorted = Object.entries(stats.by_district)
        .map(([dist, d]) => ({ district: dist, value: d[col] }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value);
      if (sorted.length > 0) {
        stats.rankings[col] = {
          top: sorted[0],
          bottom: sorted[sorted.length - 1],
        };
      }
    });

    return stats;
  } catch (e) {
    console.error(`Aggregation failed for ${table}:`, e);
    return null;
  }
}
