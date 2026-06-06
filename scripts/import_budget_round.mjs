import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

async function loadXlsx() {
  try {
    return (await import('xlsx')).default;
  } catch {
    throw new Error('This legacy Excel import script requires a local xlsx parser. The app dependency was removed because npm audit reports unresolved xlsx vulnerabilities. Convert the workbook to CSV or install a reviewed parser outside the production dependency tree before running this script.');
  }
}

const XLSX = await loadXlsx();

const defaultInput = 'C:/Users/drago/OneDrive/เดสก์ท็อป/boot/ข้อมูลใหม่ๆ/budget_2568_round1_import_ready.xlsx';

const fieldAliases = {
  sourceId: ['ลำดับ', 'no', 'id', 'sourceid'],
  plan: ['แผนงาน', 'plan'],
  project: ['โครงการ', 'project'],
  activity: ['กิจกรรม', 'activity'],
  subActivity: ['กิจกรรมย่อย', 'subactivity'],
  detail: ['รายละเอียด', 'detail'],
  district: ['อำเภอ', 'อําเภอ', 'พื้นที่', 'district'],
  subdistrict: ['ตำบล', 'ตําบล', 'subdistrict'],
  village: ['หมู่', 'หมู่ที่', 'village', 'moo'],
  target: ['เป้าหมาย', 'target'],
  unit: ['หน่วยนับ', 'หน่วยวัด', 'unit'],
  budget: ['งบประมาณ', 'งบ', 'budget', 'budgetamount'],
  spentAmount: ['เบิกจ่ายแล้ว', 'spentamount', 'spent'],
  status: ['สถานะ', 'status'],
  operationPlan: ['แผนดำเนินงาน', 'แผนดําเนินงาน', 'operationplan'],
  paymentPlan: ['แผนใช้จ่ายเงิน', 'paymentplan'],
  owner: ['ผู้รับผิดชอบ', 'owner'],
  expenseDetail: ['รายละเอียดการใช้จ่าย', 'expensedetail'],
  reimbursementDate: ['วันที่ส่งเบิก', 'reimbursementdate'],
  fiscalYear: ['ปีงบประมาณ', 'fiscalyear'],
  round: ['รอบ', 'round'],
};

function loadEnv(file = '.env') {
  if (!fs.existsSync(file)) return {};
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).reduce((env, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return env;
    const index = trimmed.indexOf('=');
    if (index === -1) return env;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = value;
    return env;
  }, {});
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[()（）:：\s._/-]+/g, '');
}

function toNumber(value, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const text = String(value || '')
    .replace(/[,\sบาท]/g, '')
    .replace(/[๐-๙]/g, digit => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(digit)));
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function findHeaderRow(rows) {
  let best = { index: 0, score: -1 };
  rows.slice(0, 25).forEach((row, index) => {
    const normalized = row.map(normalizeHeader);
    const score = Object.values(fieldAliases).reduce((total, aliases) => (
      total + (aliases.some(alias => normalized.includes(normalizeHeader(alias))) ? 1 : 0)
    ), 0);
    if (score > best.score) best = { index, score };
  });
  if (best.score < 4) {
    throw new Error('Cannot detect the budget header row. Please check the Excel template headers.');
  }
  return best.index;
}

function buildHeaderMap(headerRow) {
  const normalizedHeaders = headerRow.map(normalizeHeader);
  return Object.entries(fieldAliases).reduce((map, [field, aliases]) => {
    const normalizedAliases = aliases.map(normalizeHeader);
    const index = normalizedHeaders.findIndex(header => normalizedAliases.includes(header));
    if (index !== -1) map[field] = index;
    return map;
  }, {});
}

function getCell(row, headerMap, field) {
  const index = headerMap[field];
  return index === undefined ? '' : row[index];
}

function parseWorkbook(inputPath, fiscalYear, budgetRound) {
  const workbook = XLSX.readFile(inputPath, { cellDates: false });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
  const headerIndex = findHeaderRow(rows);
  const headerMap = buildHeaderMap(rows[headerIndex]);
  const sourceFile = path.basename(inputPath);

  const parsed = rows.slice(headerIndex + 1).map((row, index) => {
    const sourceRowId = Math.trunc(toNumber(getCell(row, headerMap, 'sourceId'), index + 1)) || index + 1;
    const rowFiscalYear = Math.trunc(toNumber(getCell(row, headerMap, 'fiscalYear'), fiscalYear)) || fiscalYear;
    const rowRound = Math.trunc(toNumber(getCell(row, headerMap, 'round'), budgetRound)) || budgetRound;
    const budget = toNumber(getCell(row, headerMap, 'budget'));
    const spentAmount = toNumber(getCell(row, headerMap, 'spentAmount'));
    const detail = {
      sourceId: sourceRowId,
      plan: cleanText(getCell(row, headerMap, 'plan')),
      project: cleanText(getCell(row, headerMap, 'project')),
      activity: cleanText(getCell(row, headerMap, 'activity')),
      subActivity: cleanText(getCell(row, headerMap, 'subActivity')),
      detail: cleanText(getCell(row, headerMap, 'detail')),
      district: cleanText(getCell(row, headerMap, 'district')),
      subdistrict: cleanText(getCell(row, headerMap, 'subdistrict')),
      village: cleanText(getCell(row, headerMap, 'village')),
      target: cleanText(getCell(row, headerMap, 'target')),
      unit: cleanText(getCell(row, headerMap, 'unit')),
      budget,
      spentAmount,
      status: cleanText(getCell(row, headerMap, 'status')) || 'กำลังดำเนินการ',
      operationPlan: cleanText(getCell(row, headerMap, 'operationPlan')),
      paymentPlan: cleanText(getCell(row, headerMap, 'paymentPlan')),
      owner: cleanText(getCell(row, headerMap, 'owner')),
      expenseDetail: cleanText(getCell(row, headerMap, 'expenseDetail')),
      reimbursementDate: cleanText(getCell(row, headerMap, 'reimbursementDate')),
      fiscalYear: rowFiscalYear,
      round: rowRound,
      sourceFile,
    };
    return {
      project_name: [detail.project, detail.activity].filter(Boolean).join(' / ') || 'รายการงบประมาณ',
      fiscal_year: rowFiscalYear,
      budget_round: rowRound,
      budget_source: detail.plan || `งบรอบ ${rowRound} ปี ${rowFiscalYear}`,
      budget_amount: budget,
      spent_amount: spentAmount,
      status: detail.status,
      notes: JSON.stringify(detail),
      source_file: sourceFile,
      source_row_id: sourceRowId,
    };
  }).filter(row => (
    row.project_name !== 'รายการงบประมาณ'
    || row.budget_amount > 0
    || cleanText(JSON.parse(row.notes).detail)
  ));

  return { rows: parsed, sheetName: workbook.SheetNames[0], headerIndex, sourceFile };
}

async function runSql(projectRef, accessToken, query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase SQL failed (${response.status}): ${text}`);
  }
  return text;
}

function upsertSql(records) {
  const json = JSON.stringify(records).replace(/\$\$/g, '$ $');
  return `
WITH incoming AS (
  SELECT * FROM jsonb_to_recordset($$${json}$$::jsonb) AS x(
    project_name text,
    fiscal_year integer,
    budget_round integer,
    budget_source text,
    budget_amount numeric,
    spent_amount numeric,
    status text,
    notes text,
    source_file text,
    source_row_id integer
  )
)
INSERT INTO budgets (
  project_name,
  fiscal_year,
  budget_round,
  budget_source,
  budget_amount,
  spent_amount,
  status,
  notes,
  source_file,
  source_row_id,
  imported_at
)
SELECT
  project_name,
  fiscal_year,
  budget_round,
  budget_source,
  budget_amount,
  spent_amount,
  status,
  notes,
  source_file,
  source_row_id,
  now()
FROM incoming
ON CONFLICT (fiscal_year, budget_round, source_file, source_row_id)
WHERE source_file IS NOT NULL AND source_row_id IS NOT NULL
DO UPDATE SET
  project_name = EXCLUDED.project_name,
  budget_source = EXCLUDED.budget_source,
  budget_amount = EXCLUDED.budget_amount,
  spent_amount = EXCLUDED.spent_amount,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  imported_at = now(),
  updated_at = now();
`;
}

async function main() {
  const inputPath = process.argv[2] || defaultInput;
  const fiscalYear = Math.trunc(toNumber(process.argv[3], 2568));
  const budgetRound = Math.trunc(toNumber(process.argv[4], 1));
  const env = { ...loadEnv(), ...process.env };
  const projectRef = env.SUPABASE_PROJECT_REF;
  const accessToken = env.SUPABASE_ACCESS_TOKEN;

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }
  if (!projectRef || !accessToken) {
    throw new Error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN');
  }

  const parsed = parseWorkbook(inputPath, fiscalYear, budgetRound);
  if (!parsed.rows.length) throw new Error('No budget rows found to import.');

  console.log(`Detected sheet "${parsed.sheetName}" with header row ${parsed.headerIndex + 1}`);
  console.log(`Prepared ${parsed.rows.length} budget rows from ${parsed.sourceFile}`);

  for (let index = 0; index < parsed.rows.length; index += 200) {
    const chunk = parsed.rows.slice(index, index + 200);
    await runSql(projectRef, accessToken, upsertSql(chunk));
    console.log(`Upserted ${Math.min(index + chunk.length, parsed.rows.length)}/${parsed.rows.length}`);
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
