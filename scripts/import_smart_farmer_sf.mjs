import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseCsv } from '../src/utils/csv.js';

const workbookPath = 'C:/Users/TOR_HOME/OneDrive/เดสก์ท็อป/boot/ข้อมูลเกษตรกรและสถาบันเกษตรกร/รวมข้อมูล_SF_2565_2569_dashboard.csv';
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
    data_year: toInteger(row['ปีข้อมูล']),
    record_code: row['รหัสระเบียน'],
    sequence_no: toInteger(row['ลำดับ']),
    citizen_id: row['เลขประจำตัวประชาชน'],
    title: row['คำนำหน้า'],
    first_name: row['ชื่อ'],
    last_name: row['นามสกุล'],
    age: toInteger(row['อายุ']),
    district: row['อำเภอ_จากที่อยู่'],
    province: row['จังหวัด_จากที่อยู่'],
    farmer_status: row['สถานะเกษตรกร'],
    agricultural_activity: row['กิจกรรมทางการเกษตร'],
    phone: row['เบอร์โทรศัพท์มือถือ'],
    education: row['การศึกษา'],
    production_standard: row['การได้รับการรับรองมาตรฐานการผลิต'],
    sales_channel: row['ช่องทางการจำหน่ายผลผลิต/สินค้า'],
    annual_agri_income: toNumber(row['รายได้รวมภาคการเกษตรของครัวเรือนเกษตรกรปีที่ผ่านมา']),
    production_area: row['พื้นที่การผลิต'],
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
