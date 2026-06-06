import fs from 'node:fs';
import process from 'node:process';

async function loadXlsx() {
  try {
    return (await import('xlsx')).default;
  } catch {
    throw new Error('This legacy Excel import script requires a local xlsx parser. The app dependency was removed because npm audit reports unresolved xlsx vulnerabilities. Convert the workbook to CSV or install a reviewed parser outside the production dependency tree before running this script.');
  }
}

const XLSX = await loadXlsx();

const DEFAULT_EXCEL =
  'C:/Users/drago/OneDrive/เดสก์ท็อป/boot/ข้อมูลใหม่ๆ/ข้อมูลแปลงใหญ่ 71 แปลง.02.06.69.xlsx';

const FIELDS = [
  'code',
  'year',
  'commodity_group',
  'commodity',
  'secondary_commodity',
  'plot_name',
  'district',
  'subdistrict',
  'phone',
  'member_count',
  'area_rai',
  'agency',
];

function readEnv(filePath = '.env') {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text || null;
}

function cleanPhone(value) {
  const text = cleanText(value);
  if (!text) return null;
  return text.replace(/^"+|"+$/g, '').replace(/\s+/g, '');
}

function toInt(value) {
  const text = cleanText(value);
  if (!text) return null;
  const number = Number.parseInt(text.replace(/,/g, ''), 10);
  return Number.isFinite(number) ? number : null;
}

function toNumber(value) {
  const text = cleanText(value);
  if (!text) return null;
  const number = Number.parseFloat(text.replace(/,/g, ''));
  return Number.isFinite(number) ? number : null;
}

function inferAgency(row) {
  if (row.commodity_group === 'ข้าว') return 'กรมการข้าว';
  if (row.commodity_group === 'ประมง') return 'กรมประมง';
  if (row.commodity_group === 'ปศุสัตว์') return 'กรมปศุสัตว์';
  return 'กรมส่งเสริมการเกษตร';
}

function normalizeKey(value) {
  return cleanText(value)
    ?.replace(/\s+/g, '')
    .replace(/นครขัยศรี/g, 'นครชัยศรี')
    .replace(/นราภิรมณ์/g, 'นราภิรมย์')
    .toLowerCase();
}

function comparable(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return String(value);
  return cleanText(value)?.replace(/^"+|"+$/g, '');
}

function readExcelRows(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false,
    blankrows: false,
  });

  return rows.slice(1).map((row) => {
    const record = {
      code: cleanText(row[1]),
      year: toInt(row[2]),
      commodity_group: cleanText(row[3]),
      commodity: cleanText(row[4]),
      secondary_commodity: cleanText(row[5]),
      plot_name: cleanText(row[6]),
      district: cleanText(row[9]),
      subdistrict: cleanText(row[10]),
      phone: cleanPhone(row[14]),
      member_count: toInt(row[18]),
      area_rai: toNumber(row[19]),
    };
    record.agency = inferAgency(record);
    return record;
  });
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

function sqlValue(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildInsertValues(record) {
  return `(${FIELDS.map((field) => sqlValue(record[field])).join(', ')})`;
}

function diffRows(excelRows, dbRows) {
  const dbByCode = new Map(dbRows.filter((row) => row.code).map((row) => [String(row.code), row]));
  const dbByNameDistrict = new Map(
    dbRows.map((row) => [`${normalizeKey(row.plot_name)}|${normalizeKey(row.district)}`, row]),
  );
  const seenDbIds = new Set();

  const inserts = [];
  const updates = [];
  const unchanged = [];

  for (const excel of excelRows) {
    const match =
      (excel.code ? dbByCode.get(String(excel.code)) : null) ||
      dbByNameDistrict.get(`${normalizeKey(excel.plot_name)}|${normalizeKey(excel.district)}`);

    if (!match) {
      inserts.push(excel);
      continue;
    }

    seenDbIds.add(match.id);
    const changes = {};
    for (const field of FIELDS) {
      const oldValue = comparable(match[field]);
      const newValue = comparable(excel[field]);
      if (newValue !== null && oldValue !== newValue) {
        changes[field] = { old: match[field], next: excel[field] };
      }
    }

    if (Object.keys(changes).length) {
      updates.push({ id: match.id, plot_name: match.plot_name, code: match.code, excel, changes });
    } else {
      unchanged.push(match);
    }
  }

  const oldOnly = dbRows.filter((row) => !seenDbIds.has(row.id));
  return { inserts, updates, unchanged, oldOnly };
}

function buildApplySql({ inserts, updates }) {
  const updateSql = updates
    .map(({ id, excel }) => {
      const assignments = FIELDS.map((field) => `${field} = ${sqlValue(excel[field])}`).join(',\n      ');
      return `UPDATE public.large_plots
    SET ${assignments},
      updated_at = NOW()
    WHERE id = ${sqlValue(id)};`;
    })
    .join('\n\n');

  const insertSql = inserts.length
    ? `INSERT INTO public.large_plots (${FIELDS.join(', ')})
VALUES
${inserts.map(buildInsertValues).join(',\n')};`
    : '';

  return [updateSql, insertSql].filter(Boolean).join('\n\n');
}

async function main() {
  const mode = process.argv[2] || 'plan';
  const filePath = process.argv[3] || DEFAULT_EXCEL;
  const env = { ...readEnv(), ...process.env };
  const projectRef = env.SUPABASE_PROJECT_REF;
  const accessToken = env.SUPABASE_ACCESS_TOKEN;

  if (!projectRef || !accessToken) {
    throw new Error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN in env');
  }

  const excelRows = readExcelRows(filePath);
  const dbRows = await runQuery(
    projectRef,
    accessToken,
    `SELECT id, ${FIELDS.join(', ')}, notes, created_at, updated_at FROM public.large_plots ORDER BY code NULLS LAST, plot_name;`,
  );
  const diff = diffRows(excelRows, dbRows);
  const sql = buildApplySql(diff);

  console.log(
    JSON.stringify(
      {
        mode,
        excelRows: excelRows.length,
        dbRows: dbRows.length,
        inserts: diff.inserts.length,
        updates: diff.updates.length,
        unchanged: diff.unchanged.length,
        oldOnly: diff.oldOnly.length,
        insertCodes: diff.inserts.map((row) => row.code),
        oldOnlyCodes: diff.oldOnly.map((row) => row.code),
        updateSummary: diff.updates.map((row) => ({
          code: row.code,
          plot_name: row.plot_name,
          fields: Object.keys(row.changes),
        })),
      },
      null,
      2,
    ),
  );

  if (mode === 'sql') {
    console.log(sql);
    return;
  }

  if (mode === 'apply') {
    if (!sql) {
      console.log('No changes to apply.');
      return;
    }
    await runQuery(projectRef, accessToken, sql);
    const [{ count }] = await runQuery(projectRef, accessToken, 'SELECT COUNT(*)::int AS count FROM public.large_plots;');
    console.log(JSON.stringify({ applied: true, finalCount: count }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
