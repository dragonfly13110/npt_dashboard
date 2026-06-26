import fs from 'node:fs';

const GEOJSON_PATH = 'public/gis/soil/nakhon-pathom-soil-series.geojson';
const SCHEMA_PATH = 'supabase/soil_series.sql';

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

function sqlString(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNumber(value) {
  return value === null || value === undefined || value === ''
    ? 'NULL'
    : String(value);
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

async function runQuery(projectRef, accessToken, query) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase query failed ${response.status}: ${body}`);
  }

  return response.json();
}

function featureToRecord(feature, metadata, index) {
  const p = feature.properties || {};
  return {
    source_feature_id: index + 1,
    ldd_soil25_id: p.FID_Soil25,
    ldd_wgs84_id: p.FID_wgs84_,
    soil_series_name: p.soilserien,
    soil_series_code: p.soilseries,
    soil_group: p.soilgroup,
    texture: p.texture_to,
    fertility: p.fertility,
    ph_top: p.pH_top,
    district: String(p.AMPHOE_T || '').replace(/^อ\./, ''),
    district_code: p.AMP_CODE,
    province: String(p.PROV_NAM_T || '').replace(/^จ\./, '') || 'นครปฐม',
    area_sqm: p.area_sqm,
    area_rai: p.area_rai,
    geometry: feature.geometry,
    raw_properties: p,
    source: metadata.source,
    source_dataset: metadata.source_dataset,
    production_year_be: metadata.production_year_be,
  };
}

function buildUpsert(records) {
  const columns = [
    'source_feature_id',
    'ldd_soil25_id',
    'ldd_wgs84_id',
    'soil_series_name',
    'soil_series_code',
    'soil_group',
    'texture',
    'fertility',
    'ph_top',
    'district',
    'district_code',
    'province',
    'area_sqm',
    'area_rai',
    'geometry',
    'raw_properties',
    'source',
    'source_dataset',
    'production_year_be',
  ];

  const values = records.map(
    (r) =>
      `(${[
        sqlNumber(r.source_feature_id),
        sqlNumber(r.ldd_soil25_id),
        sqlNumber(r.ldd_wgs84_id),
        sqlString(r.soil_series_name),
        sqlString(r.soil_series_code),
        sqlString(r.soil_group),
        sqlString(r.texture),
        sqlString(r.fertility),
        sqlString(r.ph_top),
        sqlString(r.district),
        sqlString(r.district_code),
        sqlString(r.province),
        sqlNumber(r.area_sqm),
        sqlNumber(r.area_rai),
        sqlJson(r.geometry),
        sqlJson(r.raw_properties),
        sqlString(r.source),
        sqlString(r.source_dataset),
        sqlNumber(r.production_year_be),
      ].join(', ')})`
  );

  const updates = columns
    .filter((column) => column !== 'source_feature_id')
    .map((column) => `${column}=EXCLUDED.${column}`)
    .join(', ');

  return `
INSERT INTO soil_series (${columns.join(', ')})
VALUES
${values.join(',\n')}
ON CONFLICT (source_feature_id) DO UPDATE SET
${updates},
updated_at=NOW();
`;
}

const env = { ...loadEnv('.env'), ...loadEnv('.env.local'), ...process.env };
const projectRef = env.SUPABASE_PROJECT_REF;
const accessToken = env.SUPABASE_ACCESS_TOKEN;

if (!projectRef || !accessToken) {
  throw new Error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN');
}

const geojson = JSON.parse(fs.readFileSync(GEOJSON_PATH, 'utf8'));
const metadata = geojson.metadata || {};
const records = geojson.features
  .map((feature, index) => featureToRecord(feature, metadata, index))
  .filter((record) => record.source_feature_id && record.soil_series_name);

await runQuery(projectRef, accessToken, fs.readFileSync(SCHEMA_PATH, 'utf8'));
// ponytail: source GeoJSON is authoritative; full replace beats diffing 53 polygons.
await runQuery(
  projectRef,
  accessToken,
  'TRUNCATE soil_series RESTART IDENTITY;'
);

for (let index = 0; index < records.length; index += 10) {
  const chunk = records.slice(index, index + 10);
  await runQuery(projectRef, accessToken, buildUpsert(chunk));
  console.log(
    `imported ${Math.min(index + chunk.length, records.length)}/${records.length}`
  );
}

console.log(`done ${records.length} soil series features`);
