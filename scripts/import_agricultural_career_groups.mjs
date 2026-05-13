import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import xlsx from 'xlsx';

const workbookPath = 'C:/Users/TOR_HOME/OneDrive/เดสก์ท็อป/boot/ข้อมูลเกษตรกรและสถาบันเกษตรกร/รวมข้อมูล_กสอ_2565_2568_dashboard.xlsx';
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
  const year = toInteger(row['ปีข้อมูล']);
  return {
    data_year: year,
    record_code: `KSO${year}-${String(index + 1).padStart(4, '0')}`,
    group_name: row['ชื่อกลุ่ม'],
    address_no: row['เลขที่'],
    moo: row['หมู่'],
    subdistrict: row['ตำบล'],
    district: row['อำเภอ'],
    province: row['จังหวัด'],
    mobile: row['เบอร์มือถือ'],
    established_date: row['วันที่จัดตั้งกลุ่ม'],
    established_date_ce: row['วันที่จัดตั้งกลุ่ม_ค.ศ.'],
    established_year_be: toInteger(row['ปีจัดตั้ง_พ.ศ.']),
    member_count: toInteger(row['จำนวนสมาชิกกลุ่ม_ตัวเลข']),
    community_enterprise_registration: row['การจดทะเบียนวิสาหกิจชุมชน'],
    fund_management: toNumber(row['การบริหารจัดการทุน']),
    income: toNumber(row['รายได้กลุ่ม_ตัวเลข']),
    activity: row['กิจกรรมกลุ่ม'],
    main_activity: row['กิจกรรมหลัก'],
    production_standard: row['มาตรฐานการผลิต'],
    potential_level: row['ระดับการประเมินศักยภาพ'],
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

const workbook = xlsx.readFile(workbookPath);
const rows = xlsx.utils.sheet_to_json(workbook.Sheets.DATA, { defval: null, raw: false });
const records = rows.map(rowToRecord).filter((record) => record.data_year && record.group_name);

await runQuery(projectRef, accessToken, fs.readFileSync(schemaPath, 'utf8'));

for (let index = 0; index < records.length; index += 100) {
  const chunk = records.slice(index, index + 100);
  await runQuery(projectRef, accessToken, buildUpsert(chunk));
  console.log(`imported ${Math.min(index + chunk.length, records.length)}/${records.length}`);
}

console.log(`done ${records.length} records`);
