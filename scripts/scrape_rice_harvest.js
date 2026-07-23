import fs from 'fs';
import path from 'path';
import {
  parseRiceHarvestTable,
  validateRiceHarvestRecords,
} from '../src/utils/riceHarvest.js';

for (const envPath of [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
]) {
  if (!fs.existsSync(envPath)) continue;
  const envConfig = fs.readFileSync(envPath, 'utf8');
  for (const line of envConfig.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2] || '';
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value.trim();
  }
}

export const DOAE_LOGIN_URL = 'https://farmer.doae.go.th/index/index/2';
export const DOAE_RICE_REPORT_BASE_URL =
  'https://farmer.doae.go.th/report/report6x/rice_pv_mm_1/73';
const DOAE_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';

function getEnv(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || '';
}

function requiredEnv() {
  const missing = ['DOAE_USERNAME', 'DOAE_PASSWORD', 'SUPABASE_PROJECT_REF', 'SUPABASE_ACCESS_TOKEN'].filter(
    (name) => !getEnv(name)
  );
  if (missing.length) throw new Error(`Missing required env: ${missing.join(', ')}`);
}

function getSetCookies(headers) {
  if (typeof headers?.getSetCookie === 'function') return headers.getSetCookie();
  const cookie = headers?.get?.('set-cookie');
  return cookie ? [cookie] : [];
}

function cookieHeader(setCookies) {
  const cookies = new Map();
  for (const header of setCookies) {
    const [name, ...value] = header.split(';')[0].split('=');
    if (name) cookies.set(name.trim(), value.join('=').trim());
  }
  return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function loginDoae(fetchImpl) {
  requiredEnv();
  const initial = await fetchImpl(DOAE_LOGIN_URL, {
    headers: { 'User-Agent': DOAE_USER_AGENT },
  });
  const cookies = getSetCookies(initial.headers);
  const initialCookie = cookieHeader(cookies);
  const login = await fetchImpl(
    'https://farmer.doae.go.th/home/authen/portal_authen',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: initialCookie,
        'User-Agent': DOAE_USER_AGENT,
      },
      body: new URLSearchParams({
        username: getEnv('DOAE_USERNAME'),
        password: getEnv('DOAE_PASSWORD'),
      }),
      redirect: 'manual',
    }
  );
  const allCookies = cookieHeader([...cookies, ...getSetCookies(login.headers)]);
  if (!allCookies) throw new Error('DOAE authentication did not return a session cookie');
  return allCookies;
}

function shortThaiYear(date) {
  return String((date.getFullYear() + 543) % 100).padStart(2, '0');
}

export function getCandidateSeasonCodes(date = new Date()) {
  const current = Number(shortThaiYear(date));
  return Array.from({ length: 6 }, (_, index) => `${current + 2 - index}_1`);
}

export function riceReportUrl(seasonCode) {
  return `${DOAE_RICE_REPORT_BASE_URL}/${seasonCode}/PD`;
}

function isUsableRiceReport(html) {
  return (
    /<table[^>]+id=["']table_id["']/i.test(html) &&
    /(?:กรกฎาคม|มกราคม|มิถุนายน|เดือนอื่นๆ)/u.test(html)
  );
}

function extractCropYear(html, seasonCode) {
  const match = html.match(/ปี\s*(\d{4}\/\d{2})/u);
  return match?.[1] || seasonCode;
}

export async function discoverLatestRiceReport(
  fetchImpl = fetch,
  { cookie = '', currentDate = new Date(), candidateSeasonCodes } = {}
) {
  const seasons = candidateSeasonCodes || getCandidateSeasonCodes(currentDate);
  for (const seasonCode of seasons) {
    const url = riceReportUrl(seasonCode);
    const response = await fetchImpl(url, {
      headers: { Cookie: cookie, 'User-Agent': DOAE_USER_AGENT },
    });
    if (!response.ok) continue;
    const html = await response.text();
    if (isUsableRiceReport(html)) {
      return {
        reportUrl: url,
        seasonCode,
        cropYear: extractCropYear(html, seasonCode),
        html,
      };
    }
  }
  throw new Error('No usable DOAE rice harvest report found');
}

async function runManagementSql(sql) {
  requiredEnv();
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${getEnv('SUPABASE_PROJECT_REF')}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getEnv('SUPABASE_ACCESS_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  if (!response.ok) {
    throw new Error(`Supabase query failed: ${response.status}`);
  }
  return response.json();
}

function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  return String(value);
}

function thailandDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function buildSnapshotSql(records, { snapshotDate, cropYear, sourceCutoffDate }) {
  const values = records.map((row) =>
    `(${[
      sqlValue(snapshotDate),
      sqlValue(new Date().toISOString()),
      sqlValue(sourceCutoffDate),
      sqlValue(cropYear),
      sqlValue(row.districtCode),
      sqlValue(row.district),
      sqlValue(row.harvestMonth),
      sqlValue(row.householdCount),
      sqlValue(row.plotCount),
      sqlValue(row.areaRai),
      sqlValue(row.estimatedTons),
    ].join(', ')})`
  );
  return `
    insert into public.rice_harvest_snapshots
      (snapshot_date, scraped_at, source_cutoff_date, crop_year, district_code,
       district, harvest_month, household_count, plot_count, area_rai, estimated_tons)
    values ${values.join(',\n')}
    on conflict (snapshot_date, crop_year, district_code, harvest_month)
    do update set
      scraped_at = excluded.scraped_at,
      source_cutoff_date = excluded.source_cutoff_date,
      district = excluded.district,
      household_count = excluded.household_count,
      plot_count = excluded.plot_count,
      area_rai = excluded.area_rai,
      estimated_tons = excluded.estimated_tons;
  `;
}

export async function scrapeRiceHarvest({
  fetchImpl = fetch,
  runSQL = runManagementSql,
  currentDate = new Date(),
  candidateSeasonCodes,
} = {}) {
  const cookie = await loginDoae(fetchImpl);
  const report = await discoverLatestRiceReport(fetchImpl, {
    cookie,
    currentDate,
    candidateSeasonCodes,
  });
  const parsed = parseRiceHarvestTable(report.html, { cropYear: report.cropYear });
  const validation = validateRiceHarvestRecords(parsed.records, parsed.provinceTotal);
  if (!validation.ok) throw new Error(validation.error);

  const snapshotDate = thailandDate(currentDate);
  await runSQL(
    buildSnapshotSql(parsed.records, {
      snapshotDate,
      cropYear: report.cropYear,
      sourceCutoffDate: parsed.cutoffDate,
    })
  );
  const verifyRows = await runSQL(`
    select count(*)::int as row_count
    from public.rice_harvest_snapshots
    where snapshot_date = ${sqlValue(snapshotDate)}
      and crop_year = ${sqlValue(report.cropYear)};
  `);
  const rowCount = Number(verifyRows?.[0]?.row_count || 0);
  if (rowCount < parsed.records.length) {
    throw new Error(`Rice harvest snapshot verification failed: ${rowCount} rows`);
  }
  return {
    cropYear: report.cropYear,
    snapshotDate,
    rowCount: parsed.records.length,
  };
}

if (process.argv[1] && path.basename(process.argv[1]) === 'scrape_rice_harvest.js') {
  scrapeRiceHarvest().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
