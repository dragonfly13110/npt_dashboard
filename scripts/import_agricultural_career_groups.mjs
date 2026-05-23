import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseCsv } from '../src/utils/csv.js';

const workbookPath = 'C:/Users/TOR_HOME/OneDrive/à¹€à¸”à¸ªà¸à¹Œà¸—à¹‡à¸­à¸›/boot/à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹€à¸à¸©à¸•à¸£à¸à¸£à¹à¸¥à¸°à¸ªà¸–à¸²à¸šà¸±à¸™à¹€à¸à¸©à¸•à¸£à¸à¸£/à¸£à¸§à¸¡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥_à¸à¸ªà¸­_2565_2568_dashboard.csv';
const schemaPath = path.resolve('supabase/agricultural_career_groups.sql');

function readEnv(filePath = '.env') {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function rowsToObjects(rows) {
  const [headers = [], ...dataRows] = rows;
  return dataRows
    .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])));
}
function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function toInteger(value) {
  const parsed = toNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function sqlString(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNumber(value) {
  return value === null || value === undefined || value === '' ? 'NULL' : String(value);
}

function rowToRecord(row, index) {
  const year = toInteger(row['à¸›à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥']);
  return {
    data_year: year,
    record_code: `KSO${year}-${String(index + 1).padStart(4, '0')}`,
    group_name: row['à¸Šà¸·à¹ˆà¸­à¸à¸¥à¸¸à¹ˆà¸¡'],
    address_no: row['à¹€à¸¥à¸‚à¸—à¸µà¹ˆ'],
    moo: row['à¸«à¸¡à¸¹à¹ˆ'],
    subdistrict: row['à¸•à¸³à¸šà¸¥'],
    district: row['à¸­à¸³à¹€à¸ à¸­'],
    province: row['à¸ˆà¸±à¸‡à¸«à¸§à¸±à¸”'],
    mobile: row['à¹€à¸šà¸­à¸£à¹Œà¸¡à¸·à¸­à¸–à¸·à¸­'],
    established_date: row['à¸§à¸±à¸™à¸—à¸µà¹ˆà¸ˆà¸±à¸”à¸•à¸±à¹‰à¸‡à¸à¸¥à¸¸à¹ˆà¸¡'],
    established_date_ce: row['à¸§à¸±à¸™à¸—à¸µà¹ˆà¸ˆà¸±à¸”à¸•à¸±à¹‰à¸‡à¸à¸¥à¸¸à¹ˆà¸¡_à¸„.à¸¨.'],
    established_year_be: toInteger(row['à¸›à¸µà¸ˆà¸±à¸”à¸•à¸±à¹‰à¸‡_à¸ž.à¸¨.']),
    member_count: toInteger(row['à¸ˆà¸³à¸™à¸§à¸™à¸ªà¸¡à¸²à¸Šà¸´à¸à¸à¸¥à¸¸à¹ˆà¸¡_à¸•à¸±à¸§à¹€à¸¥à¸‚']),
    community_enterprise_registration: row['à¸à¸²à¸£à¸ˆà¸”à¸—à¸°à¹€à¸šà¸µà¸¢à¸™à¸§à¸´à¸ªà¸²à¸«à¸à¸´à¸ˆà¸Šà¸¸à¸¡à¸Šà¸™'],
    fund_management: toNumber(row['à¸à¸²à¸£à¸šà¸£à¸´à¸«à¸²à¸£à¸ˆà¸±à¸”à¸à¸²à¸£à¸—à¸¸à¸™']),
    income: toNumber(row['à¸£à¸²à¸¢à¹„à¸”à¹‰à¸à¸¥à¸¸à¹ˆà¸¡_à¸•à¸±à¸§à¹€à¸¥à¸‚']),
    activity: row['à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¸à¸¥à¸¸à¹ˆà¸¡'],
    main_activity: row['à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¸«à¸¥à¸±à¸'],
    production_standard: row['à¸¡à¸²à¸•à¸£à¸à¸²à¸™à¸à¸²à¸£à¸œà¸¥à¸´à¸•'],
    potential_level: row['à¸£à¸°à¸”à¸±à¸šà¸à¸²à¸£à¸›à¸£à¸°à¹€à¸¡à¸´à¸™à¸¨à¸±à¸à¸¢à¸ à¸²à¸ž'],
    lat: toNumber(row['Lat']),
    lon: toNumber(row['Lon']),
  };
}

function buildUpsert(records) {
  const columns = [
    'data_year', 'record_code', 'group_name', 'address_no', 'moo', 'subdistrict',
    'district', 'province', 'mobile', 'established_date', 'established_date_ce',
    'established_year_be', 'member_count', 'community_enterprise_registration',
    'fund_management', 'income', 'activity', 'main_activity', 'production_standard',
    'potential_level', 'lat', 'lon',
  ];

  const values = records.map((record) => `(${[
    sqlNumber(record.data_year),
    sqlString(record.record_code),
    sqlString(record.group_name),
    sqlString(record.address_no),
    sqlString(record.moo),
    sqlString(record.subdistrict),
    sqlString(record.district),
    sqlString(record.province),
    sqlString(record.mobile),
    sqlString(record.established_date),
    sqlString(record.established_date_ce),
    sqlNumber(record.established_year_be),
    sqlNumber(record.member_count),
    sqlString(record.community_enterprise_registration),
    sqlNumber(record.fund_management),
    sqlNumber(record.income),
    sqlString(record.activity),
    sqlString(record.main_activity),
    sqlString(record.production_standard),
    sqlString(record.potential_level),
    sqlNumber(record.lat),
    sqlNumber(record.lon),
  ].join(', ')})`);

  const updates = columns
    .filter((column) => !['data_year', 'record_code'].includes(column))
    .map((column) => `${column}=EXCLUDED.${column}`)
    .join(', ');

  return `
INSERT INTO agricultural_career_groups (${columns.join(', ')})
VALUES
${values.join(',\n')}
ON CONFLICT (data_year, record_code) DO UPDATE SET
${updates},
updated_at=NOW();
`;
}

async function runQuery(projectRef, accessToken, query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase query failed ${response.status}: ${body}`);
  }

  return response.json();
}

const env = { ...readEnv(), ...process.env };
const projectRef = env.SUPABASE_PROJECT_REF;
const accessToken = env.SUPABASE_ACCESS_TOKEN;

if (!projectRef || !accessToken) {
  throw new Error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN');
}

const rows = rowsToObjects(parseCsv(fs.readFileSync(workbookPath, 'utf8')));
const records = rows.map(rowToRecord).filter((record) => record.data_year && record.group_name);

await runQuery(projectRef, accessToken, fs.readFileSync(schemaPath, 'utf8'));

for (let index = 0; index < records.length; index += 100) {
  const chunk = records.slice(index, index + 100);
  await runQuery(projectRef, accessToken, buildUpsert(chunk));
  console.log(`imported ${Math.min(index + chunk.length, records.length)}/${records.length}`);
}

console.log(`done ${records.length} records`);
