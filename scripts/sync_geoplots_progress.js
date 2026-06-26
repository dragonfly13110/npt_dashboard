/**
 * Sync GEOPLOTS parcel drawing KPI for Nakhon Pathom.
 *
 * Usage: node scripts/sync_geoplots_progress.js
 */

import fs from 'fs';
import path from 'path';

try {
  for (const envPath of [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
  ]) {
    if (!fs.existsSync(envPath)) continue;
    fs.readFileSync(envPath, 'utf8')
      .split('\n')
      .forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (!match || process.env[match[1]] !== undefined) return;
        process.env[match[1]] = (match[2] || '')
          .replace(/^["']|["']$/g, '')
          .trim();
      });
  }
} catch {
  // Local convenience only.
}

const GEOPLOTS_API = 'https://geoplots.doae.go.th/api_count_all_parcel_kpi';
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

function num(value) {
  const n = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function sqlVal(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  return String(value);
}

export function toProgressRows(rows) {
  return rows.map((row) => {
    const target = num(row.target_2_69);
    const geoplots68 = num(row.geoplots_68);
    const qgis68 = num(row.qgis_68);
    const doae = 0;
    const drawn = geoplots68 + qgis68 + doae;
    const remainingTarget = Math.max(target - drawn, 0);
    const progress = target > 0 ? (drawn / target) * 100 : 0;

    return {
      district_code: String(row.code || ''),
      district: row.name || '',
      province_code: String(row.m_code || '73'),
      province: row.m_name || 'นครปฐม',
      target_plots: target,
      drawn_plots: drawn,
      remaining_target_plots: remainingTarget,
      remaining_list_68: num(row.remain_list_68),
      remaining_list_67: num(row.remain_list_67),
      geoplots_68: geoplots68,
      geoplots_67: num(row.geoplots_67),
      qgis_68: qgis68,
      qgis_67: num(row.qgis_67),
      doae_plots: doae,
      progress_percent: Math.round(progress * 100) / 100,
      total_chart_plots:
        target +
        remainingTarget +
        num(row.remain_list_68) +
        num(row.remain_list_67) +
        drawn,
    };
  });
}

async function runSQL(sql) {
  if (!PROJECT_REF || !ACCESS_TOKEN) {
    throw new Error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN');
  }
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const text = await response.text();
  if (!response.ok)
    throw new Error(`DB query failed: ${response.status} ${text}`);
  return text ? JSON.parse(text) : [];
}

async function fetchGeoplotsRows() {
  const user = process.env.GEOPLOTS_USER || process.env.DOAE_USERNAME;
  if (!user) throw new Error('Missing GEOPLOTS_USER or DOAE_USERNAME');

  const body = new URLSearchParams({
    user,
    admin_code: '73',
    month_count: '',
  });
  const response = await fetch(GEOPLOTS_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'NPT Smart Agri Dashboard sync',
    },
    body,
  });
  if (!response.ok) throw new Error(`GEOPLOTS API failed: ${response.status}`);
  const json = await response.json();
  return json?.res?.data || [];
}

export async function syncGeoplotsProgress() {
  const rows = toProgressRows(await fetchGeoplotsRows());
  if (!rows.length) throw new Error('No GEOPLOTS rows returned');

  const columns = [
    'district_code',
    'district',
    'province_code',
    'province',
    'target_plots',
    'drawn_plots',
    'remaining_target_plots',
    'remaining_list_68',
    'remaining_list_67',
    'geoplots_68',
    'geoplots_67',
    'qgis_68',
    'qgis_67',
    'doae_plots',
    'progress_percent',
    'total_chart_plots',
  ];
  const values = rows.map(
    (row) => `(${columns.map((col) => sqlVal(row[col])).join(', ')})`
  );
  await runSQL(`
    INSERT INTO geoplots_parcel_progress (${columns.join(', ')})
    VALUES ${values.join(',\n')}
    ON CONFLICT (district_code) DO UPDATE SET
      district = EXCLUDED.district,
      province_code = EXCLUDED.province_code,
      province = EXCLUDED.province,
      target_plots = EXCLUDED.target_plots,
      drawn_plots = EXCLUDED.drawn_plots,
      remaining_target_plots = EXCLUDED.remaining_target_plots,
      remaining_list_68 = EXCLUDED.remaining_list_68,
      remaining_list_67 = EXCLUDED.remaining_list_67,
      geoplots_68 = EXCLUDED.geoplots_68,
      geoplots_67 = EXCLUDED.geoplots_67,
      qgis_68 = EXCLUDED.qgis_68,
      qgis_67 = EXCLUDED.qgis_67,
      doae_plots = EXCLUDED.doae_plots,
      progress_percent = EXCLUDED.progress_percent,
      total_chart_plots = EXCLUDED.total_chart_plots,
      snapshot_date = (NOW() AT TIME ZONE 'Asia/Bangkok')::DATE,
      scraped_at = NOW(),
      updated_at = NOW();
  `);

  return rows;
}

if (
  process.argv[1] &&
  path.basename(process.argv[1]) === 'sync_geoplots_progress.js'
) {
  syncGeoplotsProgress()
    .then((rows) => console.log(`Synced ${rows.length} GEOPLOTS rows`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
