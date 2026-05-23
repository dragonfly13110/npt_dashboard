import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseCsv } from '../src/utils/csv.js';

const workbookPath = 'C:/Users/TOR_HOME/OneDrive/à¹€à¸”à¸ªà¸à¹Œà¸—à¹‡à¸­à¸›/boot/à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹€à¸à¸©à¸•à¸£à¸à¸£à¹à¸¥à¸°à¸ªà¸–à¸²à¸šà¸±à¸™à¹€à¸à¸©à¸•à¸£à¸à¸£/à¸£à¸§à¸¡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥_SF_2565_2569_dashboard.csv';
const schemaPath = path.resolve('supabase/smart_farmer_sf.sql');

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
  const normalized = String(value).replace(/,/g, '').trim();
  const parsed = Number(normalized);
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

function rowToRecord(row) {
  return {
    data_year: toInteger(row['à¸›à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥']),
    record_code: row['à¸£à¸«à¸±à¸ªà¸£à¸°à¹€à¸šà¸µà¸¢à¸™'],
    sequence_no: toInteger(row['à¸¥à¸³à¸”à¸±à¸š']),
    citizen_id: row['à¹€à¸¥à¸‚à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™'],
    title: row['à¸„à¸³à¸™à¸³à¸«à¸™à¹‰à¸²'],
    first_name: row['à¸Šà¸·à¹ˆà¸­'],
    last_name: row['à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥'],
    age: toInteger(row['à¸­à¸²à¸¢à¸¸']),
    district: row['à¸­à¸³à¹€à¸ à¸­_à¸ˆà¸²à¸à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆ'],
    province: row['à¸ˆà¸±à¸‡à¸«à¸§à¸±à¸”_à¸ˆà¸²à¸à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆ'],
    farmer_status: row['à¸ªà¸–à¸²à¸™à¸°à¹€à¸à¸©à¸•à¸£à¸à¸£'],
    agricultural_activity: row['à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¸—à¸²à¸‡à¸à¸²à¸£à¹€à¸à¸©à¸•à¸£'],
    phone: row['à¹€à¸šà¸­à¸£à¹Œà¹‚à¸—à¸£à¸¨à¸±à¸žà¸—à¹Œà¸¡à¸·à¸­à¸–à¸·à¸­'],
    education: row['à¸à¸²à¸£à¸¨à¸¶à¸à¸©à¸²'],
    production_standard: row['à¸à¸²à¸£à¹„à¸”à¹‰à¸£à¸±à¸šà¸à¸²à¸£à¸£à¸±à¸šà¸£à¸­à¸‡à¸¡à¸²à¸•à¸£à¸à¸²à¸™à¸à¸²à¸£à¸œà¸¥à¸´à¸•'],
    sales_channel: row['à¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¸à¸²à¸£à¸ˆà¸³à¸«à¸™à¹ˆà¸²à¸¢à¸œà¸¥à¸œà¸¥à¸´à¸•/à¸ªà¸´à¸™à¸„à¹‰à¸²'],
    annual_agri_income: toNumber(row['à¸£à¸²à¸¢à¹„à¸”à¹‰à¸£à¸§à¸¡à¸ à¸²à¸„à¸à¸²à¸£à¹€à¸à¸©à¸•à¸£à¸‚à¸­à¸‡à¸„à¸£à¸±à¸§à¹€à¸£à¸·à¸­à¸™à¹€à¸à¸©à¸•à¸£à¸à¸£à¸›à¸µà¸—à¸µà¹ˆà¸œà¹ˆà¸²à¸™à¸¡à¸²']),
    production_area: row['à¸žà¸·à¹‰à¸™à¸—à¸µà¹ˆà¸à¸²à¸£à¸œà¸¥à¸´à¸•'],
  };
}

function buildUpsert(records) {
  const columns = [
    'data_year',
    'record_code',
    'sequence_no',
    'citizen_id',
    'title',
    'first_name',
    'last_name',
    'age',
    'district',
    'province',
    'farmer_status',
    'agricultural_activity',
    'phone',
    'education',
    'production_standard',
    'sales_channel',
    'annual_agri_income',
    'production_area',
  ];

  const values = records.map((record) => `(${[
    sqlNumber(record.data_year),
    sqlString(record.record_code),
    sqlNumber(record.sequence_no),
    sqlString(record.citizen_id),
    sqlString(record.title),
    sqlString(record.first_name),
    sqlString(record.last_name),
    sqlNumber(record.age),
    sqlString(record.district),
    sqlString(record.province),
    sqlString(record.farmer_status),
    sqlString(record.agricultural_activity),
    sqlString(record.phone),
    sqlString(record.education),
    sqlString(record.production_standard),
    sqlString(record.sales_channel),
    sqlNumber(record.annual_agri_income),
    sqlString(record.production_area),
  ].join(', ')})`);

  const updates = columns
    .filter((column) => !['data_year', 'record_code'].includes(column))
    .map((column) => `${column}=EXCLUDED.${column}`)
    .join(', ');

  return `
INSERT INTO smart_farmer_sf (${columns.join(', ')})
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
const records = rows.map(rowToRecord).filter((record) => record.data_year && record.record_code);

await runQuery(projectRef, accessToken, fs.readFileSync(schemaPath, 'utf8'));

for (let index = 0; index < records.length; index += 100) {
  const chunk = records.slice(index, index + 100);
  await runQuery(projectRef, accessToken, buildUpsert(chunk));
  console.log(`imported ${Math.min(index + chunk.length, records.length)}/${records.length}`);
}

console.log(`done ${records.length} records`);
