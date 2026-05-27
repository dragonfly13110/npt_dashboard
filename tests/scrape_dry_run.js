import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

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

const LOGIN_URL = 'https://farmer.doae.go.th/index/index/2';
const REPORT_URL = 'https://farmer.doae.go.th/ecoplant/eco_report/report_fmdfbd_pv69/73/';
const USERNAME = process.env.DOAE_USERNAME;
const PASSWORD = process.env.DOAE_PASSWORD;

if (!USERNAME || !PASSWORD) {
    console.error('❌ Error: Missing DOAE credentials in .env file (DOAE_USERNAME, DOAE_PASSWORD)');
    process.exit(1);
}

function parseNumber(text) {
    if (!text || text.trim() === '' || text.trim() === '--') return null;
    const cleaned = text.replace(/,/g, '').trim();
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
}

async function main() {
    console.log('🧪 Starting Scraper Dry Run Test...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();

    try {
        console.log('🔐 Step 1: Logging in to DOAE...');
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

        console.log('📊 Step 2: Navigating to report page...');
        await page.goto(REPORT_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(8000);
        console.log('✅ Report page loaded!');

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

        if (cutoffText) {
            console.log(`📅 Cutoff date found: ${cutoffText.day} ${cutoffText.month} ${cutoffText.year}`);
        } else {
            console.warn('⚠️ Cutoff date not found on page.');
        }

        const dataYear = await page.evaluate(() => {
            const cells = document.querySelectorAll('td');
            for (const cell of cells) {
                const text = cell.textContent.trim();
                const match = text.match(/ปี\s*(\d{4})/);
                if (match) return parseInt(match[1]);
            }
            return null;
        });
        console.log(`📅 Data year: ${dataYear}`);

        console.log('📋 Step 3: Extracting table rows...');
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
                continue; // Skip province total row
            }
            records.push({
                district: rawDistrict,
                household_count: parseNumber(cells[1]),
                total_updated_households: parseNumber(cells[12]),
                total_updated_area_rai: parseNumber(cells[14]),
            });
        }

        console.log('\n🔍 Parsed districts data:');
        records.forEach(r => {
            console.log(`  - ${r.district}: ครัวเรือน=${r.household_count}, ปรับปรุงสะสม=${r.total_updated_households}, พื้นที่ไร่=${r.total_updated_area_rai}`);
        });

        // Validation Checks
        if (records.length !== 7) {
            throw new Error(`Validation failed: Expected 7 districts, but found ${records.length}`);
        }

        records.forEach(r => {
            if (!r.district) throw new Error('Validation failed: District name is empty');
            if (r.household_count === null) throw new Error(`Validation failed: household_count is null for ${r.district}`);
        });

        console.log('\n✅ TEST PASSED: Scraper successfully logged in, navigated, scraped, and validated 7 districts data!');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
    } finally {
        await browser.close();
        console.log('🏁 Browser closed.');
    }
}

main();
