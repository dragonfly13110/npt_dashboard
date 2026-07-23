import fs from 'fs';
import path from 'path';
import {
  hasTbkTableShape,
  parseTbkCultivationTable,
  validateTbkCultivationRows,
} from '../src/utils/tbkCultivation.js';

for (const envPath of [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
]) {
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
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

const LOGIN_URL = 'https://farmer.doae.go.th/index/index/2';
const AUTH_URL = 'https://farmer.doae.go.th/home/authen/portal_authen';
const REPORT_URL =
  'https://farmer.doae.go.th/plants_detail/plants_select/report_select';
const REPORT_DATA_URL =
  'https://farmer.doae.go.th/plants_detail/plants_select/report_select67_view';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';

export const TBK_GROUPS = [
  ['01', 'ข้าว'],
  ['02', 'พืชไร่'],
  ['03', 'พืชผัก'],
  ['04', 'ไม้ผล'],
  ['05', 'ไม้ยืนต้น'],
  ['06', 'ไม้ดอก'],
  ['07', 'ไม้ประดับ'],
  ['08', 'สมุนไพรและเครื่องเทศ (อายุสั้น)'],
  ['09', 'สมุนไพรและเครื่องเทศ (อายุยาว)'],
  ['10', 'ปศุสัตว์'],
  ['12', 'นาเกลือสมุทร'],
  ['20', 'เพาะเลี้ยงสัตว์น้ำ'],
  ['30', 'แมลงเศรษฐกิจ'],
].map(([code, name]) => ({ code, name }));

function getEnv(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || '';
}

function requireEnv() {
  const missing = [
    'DOAE_USERNAME',
    'DOAE_PASSWORD',
    'SUPABASE_PROJECT_REF',
    'SUPABASE_ACCESS_TOKEN',
  ].filter((name) => !getEnv(name));
  if (missing.length)
    throw new Error(`Missing required env: ${missing.join(', ')}`);
}

function shortThaiYear(date = new Date()) {
  return String((date.getFullYear() + 543) % 100).padStart(2, '0');
}

export function buildTbkReportUrl(groupCode = '', year = shortThaiYear()) {
  const query = new URLSearchParams({
    year: String(year),
    ProvinceCode: '73',
    AmphurCode: '',
    TambonCode: '',
    TypeCode: groupCode,
    DetailCode: '',
    BreedCode: '',
    DetailCodeShow: '1',
    BreedCodeShow: '1',
    btnSubmit: 'แสดงข้อมูล',
  });
  return `${REPORT_DATA_URL}?${query}`;
}

function addResponseCookies(response, cookies) {
  const values =
    response.headers.getSetCookie?.() ||
    (response.headers.get('set-cookie')
      ? [response.headers.get('set-cookie')]
      : []);
  for (const header of values) {
    const [pair] = header.split(';');
    const separator = pair.indexOf('=');
    if (separator > 0) {
      cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1));
    }
  }
}

function cookieHeader(cookies) {
  return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function openSession(fetchImpl) {
  const cookies = new Map();
  const initial = await fetchImpl(LOGIN_URL, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!initial.ok) throw new Error(`DOAE session failed: ${initial.status}`);
  addResponseCookies(initial, cookies);

  const login = await fetchImpl(AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieHeader(cookies),
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      username: getEnv('DOAE_USERNAME'),
      password: getEnv('DOAE_PASSWORD'),
    }),
    redirect: 'manual',
  });
  if (login.status < 200 || login.status >= 400) {
    throw new Error(`DOAE login failed: ${login.status}`);
  }
  addResponseCookies(login, cookies);
  return cookieHeader(cookies);
}

async function fetchReport(fetchImpl, cookie, groupCode, year) {
  const response = await fetchImpl(buildTbkReportUrl(groupCode, year), {
    headers: {
      Cookie: cookie,
      Referer: REPORT_URL,
      'User-Agent': USER_AGENT,
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  if (!response.ok)
    throw new Error(`DOAE TBK report failed: ${response.status}`);
  const html = await response.text();
  if (!hasTbkTableShape(html)) {
    const title = html
      .match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/\s+/g, ' ')
      .trim();
    const tableRows = (html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || []).filter(
      (row) => (row.match(/<td\b[^>]*>[\s\S]*?<\/td>/gi) || []).length === 10
    ).length;
    throw new Error(
      `DOAE TBK report structure changed: ${groupCode || 'all'} ` +
        `(status=${response.status}, length=${html.length}, title=${title || '-'}, ` +
        `login=${html.includes('กรุณาเข้าสู่ระบบ')}, table=${html.includes('table_id_1')}, ` +
        `location=${html.includes('จังหวัด/อำเภอ/ตำบล/หมู่')}, ` +
        `plant=${html.includes('พืช/พันธ์พืช')}, disaster=${html.includes('ภัยธรรมชาติ')}, ` +
        `remaining=${html.includes('คงเหลือ')}, rows10=${tableRows})`
    );
  }
  return html;
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

async function runManagementSql(sql) {
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
  if (!response.ok)
    throw new Error(`Supabase query failed: ${response.status}`);
  return response.json();
}

function buildSnapshotSql(rows, { snapshotDate, scrapedAt }) {
  const values = rows.map(
    (row) =>
      `(${[
        snapshotDate,
        scrapedAt,
        row.dataYear,
        row.groupCode,
        row.groupName,
        row.locationCode,
        row.locationName,
        row.itemBreed,
        row.householdCount,
        row.plotCount,
        row.areaRai,
        row.disasterHouseholdCount,
        row.disasterPlotCount,
        row.disasterAreaRai,
        row.remainingAreaRai,
      ]
        .map(sqlValue)
        .join(', ')})`
  );
  return `
    begin;
    delete from public.tbk_cultivation_snapshots
    where snapshot_date = ${sqlValue(snapshotDate)}
      and data_year = ${sqlValue(rows[0].dataYear)};
    insert into public.tbk_cultivation_snapshots
      (snapshot_date, scraped_at, data_year, group_code, group_name,
       location_code, location_name, item_breed, household_count, plot_count,
       area_rai, disaster_household_count, disaster_plot_count,
       disaster_area_rai, remaining_area_rai)
    values ${values.join(',\n')}
    on conflict (snapshot_date, data_year, group_code, location_code, item_breed)
    do update set
      scraped_at = excluded.scraped_at,
      group_name = excluded.group_name,
      location_name = excluded.location_name,
      household_count = excluded.household_count,
      plot_count = excluded.plot_count,
      area_rai = excluded.area_rai,
      disaster_household_count = excluded.disaster_household_count,
      disaster_plot_count = excluded.disaster_plot_count,
      disaster_area_rai = excluded.disaster_area_rai,
      remaining_area_rai = excluded.remaining_area_rai;
    commit;
  `;
}

export async function scrapeTbkCultivation({
  fetchImpl = fetch,
  runSQL = runManagementSql,
  currentDate = new Date(),
} = {}) {
  requireEnv();
  const year = shortThaiYear(currentDate);
  const dataYear = 2500 + Number(year);
  const cookie = await openSession(fetchImpl);
  const controlHtml = await fetchReport(fetchImpl, cookie, '', year);
  const controlRows = parseTbkCultivationTable(controlHtml, {
    dataYear,
    groupCode: '_all',
    groupName: 'ทั้งหมด',
  });

  const rows = [];
  for (const group of TBK_GROUPS) {
    const html = await fetchReport(fetchImpl, cookie, group.code, year);
    rows.push(
      ...parseTbkCultivationTable(html, {
        dataYear,
        groupCode: group.code,
        groupName: group.name,
      })
    );
  }
  if (rows.length !== controlRows.length) {
    throw new Error(
      `Grouped TBK row count ${rows.length} differs from control ${controlRows.length}`
    );
  }
  const validation = validateTbkCultivationRows(rows);
  if (!validation.ok) throw new Error(validation.error);

  const snapshotDate = thailandDate(currentDate);
  await runSQL(
    buildSnapshotSql(rows, {
      snapshotDate,
      scrapedAt: currentDate.toISOString(),
    })
  );
  const verified = await runSQL(`
    select count(*)::int as row_count
    from public.tbk_cultivation_snapshots
    where snapshot_date = ${sqlValue(snapshotDate)}
      and data_year = ${sqlValue(dataYear)};
  `);
  const rowCount = Number(verified?.[0]?.row_count || 0);
  if (rowCount !== rows.length) {
    throw new Error(`TBK snapshot verification failed: ${rowCount} rows`);
  }
  return { dataYear, snapshotDate, rowCount };
}

if (
  process.argv[1] &&
  path.basename(process.argv[1]) === 'scrape_tbk_cultivation.js'
) {
  scrapeTbkCultivation()
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
