import {
  ALL_DISTRICTS,
  LATEST_YEAR,
  cropYears,
} from '../pages/interactiveDashboard/filters';
import { supabase } from '../supabaseClient';
import { useApiCache } from './useApiCache';

const LATEST_LABEL = 'ข้อมูลล่าสุด';
const DATASETS = ['tbk', 'rice', 'costs', 'forecast', 'soils'];

function finiteValues(rows, key) {
  return rows
    .filter(
      (row) => row[key] !== null && row[key] !== undefined && row[key] !== ''
    )
    .map((row) => Number(row[key]))
    .filter((value) => Number.isFinite(value));
}

function sum(rows, key) {
  const values = finiteValues(rows, key);
  return values.length
    ? values.reduce((total, value) => total + value, 0)
    : null;
}

function average(rows, key) {
  const values = finiteValues(rows, key);
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : null;
}

function uniqueCount(rows, key) {
  const count = new Set(rows.map((row) => row[key]).filter(Boolean)).size;
  return count || null;
}

function newestValue(rows, key) {
  return rows.reduce(
    (newest, row) =>
      row[key] != null && String(row[key]) > String(newest ?? '')
        ? row[key]
        : newest,
    null
  );
}

function selectYear(rows, key, selectedYear) {
  const availableYears = finiteValues(rows, key);
  const year =
    selectedYear === LATEST_YEAR
      ? Math.max(...availableYears)
      : Number(selectedYear);
  return {
    year: Number.isFinite(year) ? year : null,
    rows: Number.isFinite(year)
      ? rows.filter((row) => Number(row[key]) === year)
      : [],
  };
}

function summarizeTbk(rows, filters) {
  const selected = selectYear(rows, 'data_year', filters.year);
  const snapshotDate = newestValue(selected.rows, 'snapshot_date');
  const filtered = selected.rows.filter(
    (row) =>
      row.snapshot_date === snapshotDate &&
      (filters.district === ALL_DISTRICTS ||
        row.location_name === filters.district)
  );
  if (!filtered.length) return null;
  return {
    dataYear: selected.year,
    snapshotDate,
    householdCount: sum(filtered, 'household_count'),
    plotCount: sum(filtered, 'plot_count'),
    areaRai: sum(filtered, 'area_rai'),
  };
}

function summarizeRice(rows, filters) {
  const matchingLabels = [
    ...new Set(
      rows
        .filter((row) => {
          const years = cropYears(row.crop_year);
          return (
            years.length > 0 &&
            (filters.year === LATEST_YEAR ||
              years.includes(Number(filters.year)))
          );
        })
        .map((row) => row.crop_year)
    ),
  ];
  const cropYear = matchingLabels.sort(
    (a, b) => Math.max(...cropYears(b)) - Math.max(...cropYears(a))
  )[0];
  const cropRows = rows.filter((row) => row.crop_year === cropYear);
  const snapshotDate = newestValue(cropRows, 'snapshot_date');
  const filtered = cropRows.filter(
    (row) =>
      row.snapshot_date === snapshotDate &&
      (filters.district === ALL_DISTRICTS || row.district === filters.district)
  );
  if (!filtered.length) return null;
  return {
    cropYear,
    snapshotDate,
    householdCount: sum(filtered, 'household_count'),
    plotCount: sum(filtered, 'plot_count'),
    areaRai: sum(filtered, 'area_rai'),
    estimatedTons: sum(filtered, 'estimated_tons'),
  };
}

function summarizeCosts(rows, filters) {
  const selected = selectYear(rows, 'data_year', filters.year);
  if (!selected.rows.length) return null;
  return {
    dataYear: selected.year,
    cropCount: selected.rows.length,
    averageCostBaht: average(selected.rows, 'total_cost_baht'),
    averageRevenueBahtPerRai: average(selected.rows, 'revenue_baht_per_rai'),
  };
}

function summarizeForecast(forecast) {
  if (
    !forecast ||
    !Array.isArray(forecast.details) ||
    forecast.details.length === 0
  ) {
    return null;
  }
  return {
    forecastDate: forecast.forecast_date,
    total: forecast.details.length,
    high: forecast.details.filter((item) => item.risk_level === 'สูง').length,
    medium: forecast.details.filter((item) => item.risk_level === 'ปานกลาง')
      .length,
    low: forecast.details.filter((item) => item.risk_level === 'ต่ำ').length,
    status: LATEST_LABEL,
  };
}

function summarizeSoils(rows, filters) {
  const filtered = rows.filter(
    (row) =>
      filters.district === ALL_DISTRICTS || row.district === filters.district
  );
  if (!filtered.length) return null;
  return {
    seriesCount: uniqueCount(filtered, 'soil_series_name'),
    groupCount: uniqueCount(filtered, 'soil_group'),
    areaRai: sum(filtered, 'area_rai'),
    status: LATEST_LABEL,
  };
}

export function summarizeExtras(data, filters) {
  return {
    tbk: summarizeTbk(data.tbk || [], filters),
    rice: summarizeRice(data.rice || [], filters),
    costs: summarizeCosts(data.costs || [], filters),
    forecast: summarizeForecast(data.forecast),
    soils: summarizeSoils(data.soils || [], filters),
  };
}

export function useInteractiveExtrasData(filters, { enabled = true } = {}) {
  const query = useApiCache(
    ['interactive-extras', filters.district, filters.year],
    async () => {
      const results = await Promise.allSettled([
        supabase
          .from('tbk_cultivation_snapshots')
          .select(
            'data_year,snapshot_date,location_name,area_rai,household_count,plot_count'
          )
          .order('snapshot_date', { ascending: false }),
        supabase
          .from('rice_harvest_snapshots')
          .select(
            'snapshot_date,crop_year,district,household_count,plot_count,area_rai,estimated_tons'
          )
          .order('snapshot_date', { ascending: false }),
        supabase
          .from('production_costs')
          .select('data_year,crop_name,total_cost_baht,revenue_baht_per_rai')
          .order('data_year', { ascending: false }),
        supabase
          .from('ai_disease_forecasts')
          .select('forecast_date,details')
          .order('forecast_date', { ascending: false })
          .limit(1),
        supabase
          .from('soil_series')
          .select('district,soil_series_name,soil_group,area_rai'),
      ]);
      const errors = {};
      const rows = results.map((result, index) => {
        if (result.status === 'rejected') {
          errors[DATASETS[index]] = result.reason;
          return null;
        }
        if (result.value.error) {
          errors[DATASETS[index]] = result.value.error;
          return null;
        }
        return result.value.data || [];
      });
      return {
        ...summarizeExtras(
          {
            tbk: rows[0],
            rice: rows[1],
            costs: rows[2],
            forecast: rows[3]?.[0] || null,
            soils: rows[4],
          },
          filters
        ),
        errors,
      };
    },
    { enabled }
  );
  return {
    tbk: query.data?.tbk ?? null,
    rice: query.data?.rice ?? null,
    costs: query.data?.costs ?? null,
    forecast: query.data?.forecast ?? null,
    soils: query.data?.soils ?? null,
    loading: query.isLoading,
    errors: query.data?.errors || {},
    error:
      query.error ||
      Object.values(query.data?.errors || {}).find(Boolean) ||
      null,
    refetch: query.refetch,
  };
}
