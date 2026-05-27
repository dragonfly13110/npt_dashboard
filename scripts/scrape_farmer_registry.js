/**
 * Scrape DOAE farmer registry report & insert into Supabase via Management API
 *
 * Usage: node scripts/scrape_farmer_registry.js
 */
import { chromium } from 'playwright';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env loader
try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                process.env[key] = value.trim();
            }
        });
    }
} catch (e) {
    // Ignore env loading errors
}

// --- Config ---
const LOGIN_URL = 'https://farmer.doae.go.th/index/index/2';
const REPORT_URL = 'https://farmer.doae.go.th/ecoplant/eco_report/report_fmdfbd_pv69/73/';
const USERNAME = process.env.DOAE_USERNAME;
const PASSWORD = process.env.DOAE_PASSWORD;

// Supabase Management API (bypasses RLS)
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!USERNAME || !PASSWORD || !PROJECT_REF || !ACCESS_TOKEN) {
    console.error('❌ Error: Missing credentials in .env file (DOAE_USERNAME, DOAE_PASSWORD, SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN)');
    process.exit(1);
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
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, body: text };
}

async function main() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();

    try {
        // === Step 1: Login ===
        console.log('🔐 Logging in to DOAE...');
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.fill('#username', USERNAME);
        await page.fill('#password', PASSWORD);
        await page.evaluate(() => {
            const form = document.querySelector('form') || document.getElementById('form1');
            if (form) form.submit();
        });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(3000);

        if (!page.url().includes('/farmer')) {
            throw new Error(`Login failed. Current URL: ${page.url()}`);
        }
        console.log('✅ Login successful!');

        // === Step 2: Navigate to report ===
        console.log('📊 Navigating to report page...');
        await page.goto(REPORT_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(8000);
        console.log('✅ Report page loaded!');

        // === Step 3: Extract cutoff date ===
        const cutoffText = await page.evaluate(() => {
            const cells = document.querySelectorAll('td');
            for (const cell of cells) {
                const text = cell.textContent.trim();
                if (text.includes('วันที่ตัดยอดข้อมูล')) {
                    const match = text.match(/(\d+)\s+(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s+(\d{4})/);
                    return match ? { day: match[1], month: match[2], year: match[3] } : null;
                }
            }
            return null;
        });

        let cutoffDate = null;
        if (cutoffText) {
            const thaiMonths = {
                'มกราคม': '01', 'กุมภาพันธ์': '02', 'มีนาคม': '03', 'เมษายน': '04',
                'พฤษภาคม': '05', 'มิถุนายน': '06', 'กรกฎาคม': '07', 'สิงหาคม': '08',
                'กันยายน': '09', 'ตุลาคม': '10', 'พฤศจิกายน': '11', 'ธันวาคม': '12'
            };
            const ceYear = parseInt(cutoffText.year) - 543;
            const month = thaiMonths[cutoffText.month] || '01';
            const day = cutoffText.day.padStart(2, '0');
            cutoffDate = `${ceYear}-${month}-${day}`;
            console.log(`📅 Cutoff date: ${cutoffDate} (${cutoffText.day} ${cutoffText.month} ${cutoffText.year})`);
        }

        // === Step 4: Extract data year ===
        const dataYear = await page.evaluate(() => {
            const cells = document.querySelectorAll('td');
            for (const cell of cells) {
                const text = cell.textContent.trim();
                const match = text.match(/ปี\s*(\d{4})/);
                if (match) return parseInt(match[1]);
            }
            return null;
        });
        console.log(`📅 Data year (พ.ศ.): ${dataYear}`);

        // === Step 5: Extract table data ===
        console.log('📋 Extracting table data...');
        const tableData = await page.evaluate(() => {
            const tables = document.querySelectorAll('table');
            for (const table of tables) {
                const tds = table.querySelectorAll('td');
                const hasDistrict = Array.from(tds).some(td =>
                    td.textContent.includes('นครปฐม') && !td.textContent.includes('ผู้ใช้งาน')
                );
                if (!hasDistrict) continue;

                const rows = table.querySelectorAll('tr');
                const data = [];
                for (const row of rows) {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 17) {
                        const cellTexts = Array.from(cells).map(c => c.textContent.trim());
                        const firstCell = cellTexts[0];
                        if (firstCell && !firstCell.includes('จังหวัด') && !firstCell.includes('ครัวเรือน') && !firstCell.includes('แปลง') && !firstCell.includes('เนื้อที่')) {
                            data.push(cellTexts);
                        }
                    }
                }
                if (data.length > 0) return data;
            }
            return [];
        });

        console.log(`📊 Found ${tableData.length} data rows`);

        const records = [];
        for (const cells of tableData) {
            const rawDistrict = cells[0].replace(/^\s+/, '').trim();
            if (rawDistrict === 'นครปฐม' || rawDistrict === 'จังหวัดนครปฐม') {
                continue; // Skip province total row, let DB trigger calculate it!
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

        console.log('\n📊 Extracted records:');
        records.forEach(r => {
            console.log(`  ${r.district}: ครัวเรือน=${r.household_count}, ปรับปรุงรวม=${r.total_updated_households}, เนื้อที่=${r.total_updated_area_rai} ไร่`);
        });

        // === Step 7: Upsert via Management API SQL ===
        console.log('\n💾 Inserting into Supabase via Management API...');

        // First delete existing data for this year
        const deleteResult = await runSQL(`DELETE FROM farmer_registry WHERE data_year = ${dataYear};`);
        console.log(`  🗑️  Deleted existing data for year ${dataYear}: ${deleteResult.ok ? 'OK' : 'Failed'}`);

        // Build INSERT SQL
        const columns = [
            'district', 'household_count', 'target',
            'update_tbk_households', 'update_tbk_plots', 'update_tbk_area_rai',
            'update_farmbook_households', 'update_farmbook_plots', 'update_farmbook_area_rai',
            'update_eform_households', 'update_eform_plots', 'update_eform_area_rai',
            'total_updated_households', 'total_updated_plots', 'total_updated_area_rai',
            'cancelled_households', 'net_total_households',
            'farm_area_rai', 'data_year', 'cutoff_date'
        ];

        const values = records.map(r => {
            const vals = columns.map(col => sqlVal(r[col]));
            return `(${vals.join(', ')})`;
        });

        const insertSQL = `
            INSERT INTO farmer_registry (${columns.join(', ')})
            VALUES ${values.join(',\n                   ')};
        `;

        const insertResult = await runSQL(insertSQL);
        if (insertResult.ok) {
            console.log(`  ✅ Inserted ${records.length} records successfully!`);
        } else {
            console.error(`  ❌ Insert failed: ${insertResult.body}`);
        }

        // === Step 8: Verify ===
        console.log('\n🔍 Verifying data...');
        const verifyResult = await runSQL(`SELECT district, household_count, total_updated_households, total_updated_area_rai, data_year FROM farmer_registry WHERE data_year = ${dataYear} ORDER BY district;`);

        if (verifyResult.ok) {
            const data = JSON.parse(verifyResult.body);
            console.log(`  ✅ Found ${data.length} records in database:`);
            data.forEach(r => {
                console.log(`    ${r.district}: ครัวเรือน=${r.household_count}, ปรับปรุง=${r.total_updated_households}, เนื้อที่=${r.total_updated_area_rai}`);
            });
        }

        console.log('\n🎉 ทั้งหมดเสร็จสิ้น!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: 'tmp/error_screenshot.png', fullPage: true }).catch(() => {});
    } finally {
        await browser.close();
        console.log('✅ Browser closed');
    }
}

main();
