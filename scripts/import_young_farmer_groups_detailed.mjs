import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseCsv } from '../src/utils/csv.js';

const workbookPath = 'C:/Users/TOR_HOME/OneDrive/เดสก์ท็อป/boot/ข้อมูลเกษตรกรและสถาบันเกษตรกร/รวมข้อมูล_กยว_2565_2568_dashboardv1.csv';
const schemaPath = path.resolve('supabase/young_farmer_groups_detailed.sql');

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
  if (value === null || value === undefined || value === '' || value === '-') return null;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function toInteger(value) {
  const parsed = toNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function sqlString(value) {
  const text = cleanText(value);
  if (text === null) return 'NULL';
  return `'${text.replace(/'/g, "''")}'`;
}

function sqlNumber(value) {
  return value === null || value === undefined || value === '' ? 'NULL' : String(value);
}

function rowToRecord(row) {
  return {
    data_year: toInteger(row['ปีข้อมูล']),
    record_code: cleanText(row['รหัสระเบียน']),
    group_name: cleanText(row['ชื่อกลุ่ม']),
    address_no: cleanText(row['เลขที่']),
    moo: cleanText(row['หมู่']),
    subdistrict: cleanText(row['ตำบล']),
    district: cleanText(row['อำเภอ']),
    province: cleanText(row['จังหวัด']),
    phone: cleanText(row['เบอร์โทรศัพท์']),
    mobile: cleanText(row['เบอร์มือถือ']),
    established_date: cleanText(row['วันที่จัดตั้งกลุ่ม']),
    established_year_be: toInteger(row['ปีจัดตั้ง_พ.ศ.']),
    established_year_ce: toInteger(row['ปีจัดตั้ง_ค.ศ.']),
    member_count: toInteger(row['จำนวนสมาชิกกลุ่ม']),
    model_group: cleanText(row['การเป็นกลุ่มต้นแบบ']),
    fund_management: toNumber(row['การบริหารจัดการทุน_บาท']),
    income: toNumber(row['รายได้กลุ่ม_บาท']),
    activity: cleanText(row['กิจกรรมกลุ่ม']),
    activity_count: toInteger(row['จำนวนกิจกรรมที่ระบุ']),
    potential_level: cleanText(row['ระดับการประเมินศักยภาพ']),
    lat: toNumber(row.Lat),
    lon: toNumber(row.Lon),
  };
}

function buildUpsert(records) {
  const columns = [
    'data_year',
    'record_code',
    'group_name',
    'address_no',
    'moo',
    'subdistrict',
    'district',
    'province',
    'phone',
    'mobile',
    'established_date',
    'established_year_be',
    'established_year_ce',
    'member_count',
    'model_group',
    'fund_management',
    'income',
    'activity',
    'activity_count',
    'potential_level',
    'lat',
    'lon',
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
    sqlString(record.phone),
    sqlString(record.mobile),
    sqlString(record.established_date),
    sqlNumber(record.established_year_be),
    sqlNumber(record.established_year_ce),
    sqlNumber(record.member_count),
    sqlString(record.model_group),
    sqlNumber(record.fund_management),
    sqlNumber(record.income),
    sqlString(record.activity),
    sqlNumber(record.activity_count),
    sqlString(record.potential_level),
    sqlNumber(record.lat),
    sqlNumber(record.lon),
  ].join(', ')})`);

  const updates = columns
    .filter((column) => !['data_year', 'record_code'].includes(column))
    .map((column) => `${column}=EXCLUDED.${column}`)
    .join(', ');

  return `
INSERT INTO young_farmer_groups_detailed (${columns.join(', ')})
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
const records = rows.map(rowToRecord).filter((record) => record.data_year && record.record_code && record.group_name);

await runQuery(projectRef, accessToken, fs.readFileSync(schemaPath, 'utf8'));

for (let index = 0; index < records.length; index += 100) {
  const chunk = records.slice(index, index + 100);
  await runQuery(projectRef, accessToken, buildUpsert(chunk));
  console.log(`imported ${Math.min(index + chunk.length, records.length)}/${records.length}`);
}

console.log(`done ${records.length} records`);
