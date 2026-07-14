import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import {
  classifyLatLng,
  classifyUtm47N,
} from '../src/features/smart-map/utils/coordinateValidation.js';

const POINT_LAYERS = [
  ['young_farmer_groups_detailed', 'lat', 'lon'],
  ['agricultural_career_groups', 'lat', 'lon'],
  ['housewife_farmer_groups', 'lat', 'lon'],
  ['fire_hotspots', 'latitude', 'longitude'],
  ['gis_areas', 'latitude', 'longitude'],
  ['agri_tourism', 'latitude', 'longitude'],
];

const SUMMARY_TABLES = [
  'agricultural_areas',
  'farmer_registry_subdistricts',
  'geoplots_parcel_progress',
  'geoplots_parcel_subdistrict_progress',
  'community_enterprises',
  'large_plots',
  'smart_farmer_sf',
  'young_smart_farmer_ysf',
  'certifications',
  'learning_centers',
  'pest_centers',
  'soil_fertilizer_centers',
  'plant_doctors',
  'disasters',
  'pest_outbreaks',
  'crop_production',
  'ai_disease_forecasts',
];

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [
          line.slice(0, index),
          line.slice(index + 1).replace(/^["']|["']$/g, ''),
        ];
      })
  );
}

async function fetchAllRows(query, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

function summarizeCoordinates(rows, classify, firstField, secondField) {
  const result = {
    totalRows: rows.length,
    coordinateRows: 0,
    validCoordinateCount: 0,
    invalidCoordinateCount: 0,
    outsideProvinceCount: 0,
    duplicateCoordinateCount: 0,
  };
  const seen = new Set();

  for (const row of rows) {
    const state = classify(row[firstField], row[secondField]);
    if (state === 'missing') continue;
    result.coordinateRows += 1;
    if (state === 'invalid') {
      result.invalidCoordinateCount += 1;
      continue;
    }
    if (state === 'outside_province') {
      result.outsideProvinceCount += 1;
      continue;
    }
    result.validCoordinateCount += 1;
    const key = `${row[firstField]},${row[secondField]}`;
    if (seen.has(key)) result.duplicateCoordinateCount += 1;
    seen.add(key);
  }
  return result;
}

async function auditPointLayer(supabase, [tableName, firstField, secondField]) {
  try {
    const rows = await fetchAllRows(
      supabase.from(tableName).select(`${firstField},${secondField}`)
    );
    return {
      tableName,
      coordinateType: 'lat_lon',
      ...summarizeCoordinates(rows, classifyLatLng, firstField, secondField),
    };
  } catch (error) {
    return { tableName, error: error.message };
  }
}

async function auditForecastPlots(supabase) {
  try {
    const rows = await fetchAllRows(
      supabase.from('forecast_plots').select('coord_x,coord_y')
    );
    return {
      tableName: 'forecast_plots',
      coordinateType: 'utm_47n',
      ...summarizeCoordinates(rows, classifyUtm47N, 'coord_x', 'coord_y'),
    };
  } catch (error) {
    return { tableName: 'forecast_plots', error: error.message };
  }
}

async function countTable(supabase, tableName) {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });
  return error
    ? { tableName, error: error.message }
    : { tableName, totalRows: count || 0 };
}

export async function auditSmartMapLayers(env = {}) {
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [pointLayers, forecastPlots, summaryTables, soilSeries] =
    await Promise.all([
      Promise.all(
        POINT_LAYERS.map((layer) => auditPointLayer(supabase, layer))
      ),
      auditForecastPlots(supabase),
      Promise.all(
        SUMMARY_TABLES.map((tableName) => countTable(supabase, tableName))
      ),
      countTable(supabase, 'soil_series'),
    ]);
  return {
    generatedAt: new Date().toISOString(),
    pointLayers: [...pointLayers, forecastPlots],
    polygonLayers: [soilSeries],
    summaryTables,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const env = { ...loadEnv('.env'), ...loadEnv('.env.local'), ...process.env };
  console.log(JSON.stringify(await auditSmartMapLayers(env), null, 2));
}
