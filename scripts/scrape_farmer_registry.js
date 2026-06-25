/**
 * Scrape DOAE farmer registry report & insert into Supabase via Management API
 *
 * Usage: node scripts/scrape_farmer_registry.js
 */
// Playwright browser import removed for serverless compatibility

import fs from 'fs';
import path from 'path';

// Simple .env loader
try {
  const envPaths = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
  ];
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        if (process.env[key] !== undefined) return;
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"'))
          value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'"))
          value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
} catch (e) {
  // Ignore env loading errors
}

// --- Config ---
const LOGIN_URL = 'https://farmer.doae.go.th/index/index/2';
const REPORT_URL =
  'https://farmer.doae.go.th/ecoplant/eco_report/report_fmdfbd_pv69/73/';
const USERNAME = process.env.DOAE_USERNAME;
const PASSWORD = process.env.DOAE_PASSWORD;

// Supabase Management API (bypasses RLS)
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

function validateRequiredEnv() {
  const missing = [];
  if (!process.env.DOAE_USERNAME) missing.push('DOAE_USERNAME');
  if (!process.env.DOAE_PASSWORD) missing.push('DOAE_PASSWORD');
  if (!process.env.SUPABASE_PROJECT_REF) missing.push('SUPABASE_PROJECT_REF');
  if (!process.env.SUPABASE_ACCESS_TOKEN) missing.push('SUPABASE_ACCESS_TOKEN');
  if (missing.length) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }
}

function parseNumber(text) {
  if (!text || text.trim() === '' || text.trim() === '--') return null;
  const cleaned = text.replace(/,/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

function sqlVal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
  return String(v);
}

async function runSQL(sql) {
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
  return { ok: response.ok, status: response.status, body: text };
}

export async function scrapeFarmerRegistry() {
  validateRequiredEnv();

  try {
    // === Step 1: Initialize Session Cookie ===
    console.log('🔐 Initializing DOAE session...');
    const initialRes = await fetch('https://farmer.doae.go.th/index/index/2');
    const initialSetCookies = initialRes.headers.getSetCookie();

    const cookieMap = new Map();
    const addCookies = (setCookieHeaders) => {
      for (const header of setCookieHeaders) {
        const parts = header.split(';')[0].split('=');
        const name = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        cookieMap.set(name, value);
      }
    };

    addCookies(initialSetCookies);
    const getCookieHeaderString = () => {
      return Array.from(cookieMap.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
    };

    // === Step 2: Login via POST ===
    console.log('🔐 Logging in to DOAE via HTTP POST...');
    const loginRes = await fetch(
      'https://farmer.doae.go.th/home/authen/portal_authen',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: getCookieHeaderString(),
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: new URLSearchParams({
          username: USERNAME,
          password: PASSWORD,
        }),
        redirect: 'manual',
      }
    );

    const loginSetCookies = loginRes.headers.getSetCookie();
    addCookies(loginSetCookies);
    console.log('✅ Login successful!');

    // === Step 3: Navigate/Fetch Report Page ===
    console.log('📊 Fetching report page via HTTP GET...');
    const reportRes = await fetch(REPORT_URL, {
      headers: {
        Cookie: getCookieHeaderString(),
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!reportRes.ok) {
      throw new Error(
        `Failed to fetch report. HTTP Status: ${reportRes.status}`
      );
    }

    const reportHtml = await reportRes.text();
    if (reportHtml.includes('กรุณาเข้าสู่ระบบก่อน')) {
      throw new Error(
        'Authentication expired or invalid. Please check credentials.'
      );
    }
    console.log('✅ Report page loaded!');

    // === Step 4: Extract cutoff date ===
    const cutoffMatch = reportHtml.match(
      /(\d+)\s+(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s+(\d{4})/
    );
    let cutoffDate = null;
    if (cutoffMatch) {
      const thaiMonths = {
        มกราคม: '01',
        กุมภาพันธ์: '02',
        มีนาคม: '03',
        เมษายน: '04',
        พฤษภาคม: '05',
        มิถุนายน: '06',
        กรกฎาคม: '07',
        สิงหาคม: '08',
        กันยายน: '09',
        ตุลาคม: '10',
        พฤศจิกายน: '11',
        ธันวาคม: '12',
      };
      const ceYear = parseInt(cutoffMatch[3]) - 543;
      const month = thaiMonths[cutoffMatch[2]] || '01';
      const day = cutoffMatch[1].padStart(2, '0');
      cutoffDate = `${ceYear}-${month}-${day}`;
      console.log(
        `📅 Cutoff date: ${cutoffDate} (${cutoffMatch[1]} ${cutoffMatch[2]} ${cutoffMatch[3]})`
      );
    }

    // === Step 5: Extract data year ===
    const yearMatch = reportHtml.match(/ปี\s*(\d{4})/);
    const dataYear = yearMatch ? parseInt(yearMatch[1]) : null;
    console.log(`📅 Data year (พ.ศ.): ${dataYear}`);

    // === Step 6: Extract table data via regex ===
    console.log('📋 Extracting table data...');
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

    const records = [];
    let provinceTarget = null;
    let trMatch;
    let tableRowsCount = 0;

    while ((trMatch = trRegex.exec(reportHtml)) !== null) {
      const trContent = trMatch[1];
      const cells = [];
      let tdMatch;
      while ((tdMatch = tdRegex.exec(trContent)) !== null) {
        const cellText = tdMatch[1]
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        cells.push(cellText);
      }

      if (cells.length >= 17) {
        const firstCell = cells[0];
        if (
          firstCell &&
          !firstCell.includes('จังหวัด') &&
          !firstCell.includes('ครัวเรือน') &&
          !firstCell.includes('แปลง') &&
          !firstCell.includes('เนื้อที่')
        ) {
          tableRowsCount++;
          const rawDistrict = firstCell.replace(/^\s+/, '').trim();
          if (rawDistrict === 'นครปฐม' || rawDistrict === 'จังหวัดนครปฐม') {
            provinceTarget = parseNumber(cells[2]);
            continue;
          }
          records.push({
            district: rawDistrict,
            household_count: parseNumber(cells[1]),
            target: parseNumber(cells[2]),
            update_tbk_households: parseNumber(cells[3]),
            update_tbk_plots: parseNumber(cells[4]),
            update_tbk_area_rai: parseNumber(cells[5]),
            update_farmbook_households: parseNumber(cells[6]),
            update_farmbook_plots: parseNumber(cells[7]),
            update_farmbook_area_rai: parseNumber(cells[8]),
            update_eform_households: parseNumber(cells[9]),
            update_eform_plots: parseNumber(cells[10]),
            update_eform_area_rai: parseNumber(cells[11]),
            total_updated_households: parseNumber(cells[12]),
            total_updated_plots: parseNumber(cells[13]),
            total_updated_area_rai: parseNumber(cells[14]),
            cancelled_households: parseNumber(cells[15]),
            net_total_households: parseNumber(cells[16]),
            farm_area_rai: parseNumber(cells[14]),
            data_year: dataYear,
            cutoff_date: cutoffDate,
          });
        }
      }
    }

    console.log(
      `📊 Found ${records.length} district data rows (total table rows processed: ${tableRowsCount})`
    );

    console.log('\n📊 Extracted records:');
    records.forEach((r) => {
      console.log(
        `  ${r.district}: ครัวเรือน=${r.household_count}, ปรับปรุงรวม=${r.total_updated_households}, เนื้อที่=${r.total_updated_area_rai} ไร่`
      );
    });

    // === Step 7: Store progress snapshot and update latest state ===
    console.log(
      '\n💾 Saving Supabase snapshot and latest state via Management API...'
    );

    const columns = [
      'district',
      'household_count',
      'target',
      'update_tbk_households',
      'update_tbk_plots',
      'update_tbk_area_rai',
      'update_farmbook_households',
      'update_farmbook_plots',
      'update_farmbook_area_rai',
      'update_eform_households',
      'update_eform_plots',
      'update_eform_area_rai',
      'total_updated_households',
      'total_updated_plots',
      'total_updated_area_rai',
      'cancelled_households',
      'net_total_households',
      'farm_area_rai',
      'data_year',
      'cutoff_date',
    ];

    const values = records.map((r) => {
      const vals = columns.map((col) => sqlVal(r[col]));
      return `(${vals.join(', ')})`;
    });

    if (values.length === 0) {
      throw new Error(
        'No district records were scraped; skip database update.'
      );
    }

    const snapshotSQL = `
            INSERT INTO farmer_registry_snapshots (${columns.join(', ')})
            VALUES ${values.join(',\n                   ')}
            ON CONFLICT (snapshot_date, district, data_year) DO UPDATE SET
                household_count = EXCLUDED.household_count,
                target = EXCLUDED.target,
                update_tbk_households = EXCLUDED.update_tbk_households,
                update_tbk_plots = EXCLUDED.update_tbk_plots,
                update_tbk_area_rai = EXCLUDED.update_tbk_area_rai,
                update_farmbook_households = EXCLUDED.update_farmbook_households,
                update_farmbook_plots = EXCLUDED.update_farmbook_plots,
                update_farmbook_area_rai = EXCLUDED.update_farmbook_area_rai,
                update_eform_households = EXCLUDED.update_eform_households,
                update_eform_plots = EXCLUDED.update_eform_plots,
                update_eform_area_rai = EXCLUDED.update_eform_area_rai,
                total_updated_households = EXCLUDED.total_updated_households,
                total_updated_plots = EXCLUDED.total_updated_plots,
                total_updated_area_rai = EXCLUDED.total_updated_area_rai,
                cancelled_households = EXCLUDED.cancelled_households,
                net_total_households = EXCLUDED.net_total_households,
                farm_area_rai = EXCLUDED.farm_area_rai,
                cutoff_date = EXCLUDED.cutoff_date,
                scraped_at = NOW(),
                updated_at = NOW();
        `;

    const snapshotResult = await runSQL(snapshotSQL);
    if (snapshotResult.ok) {
      console.log(
        `  ✅ Saved ${records.length} district snapshot records successfully!`
      );
    } else {
      console.error(`  ❌ Snapshot insert failed: ${snapshotResult.body}`);
      process.exitCode = 1;
      return;
    }

    const latestStateSQL = `
            INSERT INTO farmer_registry (${columns.join(', ')})
            VALUES ${values.join(',\n                   ')}
            ON CONFLICT (district, data_year) DO UPDATE SET
                household_count = EXCLUDED.household_count,
                target = EXCLUDED.target,
                update_tbk_households = EXCLUDED.update_tbk_households,
                update_tbk_plots = EXCLUDED.update_tbk_plots,
                update_tbk_area_rai = EXCLUDED.update_tbk_area_rai,
                update_farmbook_households = EXCLUDED.update_farmbook_households,
                update_farmbook_plots = EXCLUDED.update_farmbook_plots,
                update_farmbook_area_rai = EXCLUDED.update_farmbook_area_rai,
                update_eform_households = EXCLUDED.update_eform_households,
                update_eform_plots = EXCLUDED.update_eform_plots,
                update_eform_area_rai = EXCLUDED.update_eform_area_rai,
                total_updated_households = EXCLUDED.total_updated_households,
                total_updated_plots = EXCLUDED.total_updated_plots,
                total_updated_area_rai = EXCLUDED.total_updated_area_rai,
                cancelled_households = EXCLUDED.cancelled_households,
                net_total_households = EXCLUDED.net_total_households,
                farm_area_rai = EXCLUDED.farm_area_rai,
                cutoff_date = EXCLUDED.cutoff_date,
                updated_at = NOW();
        `;

    const latestStateResult = await runSQL(latestStateSQL);
    if (latestStateResult.ok) {
      console.log(
        `  ✅ Updated latest farmer_registry state for ${records.length} districts successfully!`
      );
    } else {
      console.error(
        `  ❌ Latest state update failed: ${latestStateResult.body}`
      );
      process.exitCode = 1;
      return;
    }

    if (provinceTarget !== null && dataYear) {
      const provinceTargetSQL = `
                UPDATE farmer_registry
                SET target = ${sqlVal(provinceTarget)}, updated_at = NOW()
                WHERE district IN ('นครปฐม', 'จังหวัดนครปฐม')
                  AND data_year = ${sqlVal(dataYear)};
            `;
      const provinceTargetResult = await runSQL(provinceTargetSQL);
      if (!provinceTargetResult.ok) {
        console.error(
          `  ❌ Province target update failed: ${provinceTargetResult.body}`
        );
      }
    }

    // === Step 8: Verify ===
    console.log('\n🔍 Verifying data in database...');
    const verifyResult = await runSQL(
      `SELECT district, household_count, total_updated_households, total_updated_area_rai, data_year FROM farmer_registry WHERE data_year = ${dataYear} ORDER BY district;`
    );

    if (verifyResult.ok) {
      const data = JSON.parse(verifyResult.body);
      console.log(`  ✅ Found ${data.length} records in database:`);
      data.forEach((r) => {
        console.log(
          `    ${r.district}: ครัวเรือน=${r.household_count}, ปรับปรุง=${r.total_updated_households}, เนื้อที่=${r.total_updated_area_rai}`
        );
      });
    }

    console.log('\n🎉 ทั้งหมดเสร็จสิ้น!');
  } catch (error) {
    console.error('❌ Error during sync:', error.message);
    throw error;
  }
}

if (
  process.argv[1] &&
  path.basename(process.argv[1]) === 'scrape_farmer_registry.js'
) {
  scrapeFarmerRegistry().catch(() => {
    process.exitCode = 1;
  });
}
