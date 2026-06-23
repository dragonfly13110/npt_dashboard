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

const LOGIN_URL = 'https://farmer.doae.go.th/home/authen/portal_authen';
const REPORT_URL =
  'https://farmer.doae.go.th/ecoplant/eco_report/report_fmdfbd_pv69/73/';
const USERNAME = process.env.DOAE_USERNAME;
const PASSWORD = process.env.DOAE_PASSWORD;

if (!USERNAME || !PASSWORD) {
  console.error(
    '❌ Error: Missing DOAE credentials in .env or .env.local file (DOAE_USERNAME, DOAE_PASSWORD)'
  );
  process.exit(1);
}

function parseNumber(text) {
  if (!text || text.trim() === '' || text.trim() === '--') return null;
  const cleaned = text.replace(/,/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

async function main() {
  console.log('🧪 Starting Scraper Dry Run Test (HTTP Fetch Mode)...');

  try {
    // === Step 1: Initialize Session Cookie ===
    console.log('🔐 Step 1: Initializing DOAE session...');
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
    console.log('🔐 Step 2: Logging in to DOAE via HTTP POST...');
    const loginRes = await fetch(LOGIN_URL, {
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
    });

    const loginSetCookies = loginRes.headers.getSetCookie();
    addCookies(loginSetCookies);
    console.log('✅ Login successful!');

    // === Step 3: Fetch Report Page ===
    console.log('📊 Step 3: Fetching report page via HTTP GET...');
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
    if (cutoffMatch) {
      console.log(
        `📅 Cutoff date found: ${cutoffMatch[1]} ${cutoffMatch[2]} ${cutoffMatch[3]}`
      );
    } else {
      console.warn('⚠️ Cutoff date not found on page.');
    }

    // === Step 5: Extract data year ===
    const yearMatch = reportHtml.match(/ปี\s*(\d{4})/);
    const dataYear = yearMatch ? parseInt(yearMatch[1]) : null;
    console.log(`📅 Data year: ${dataYear}`);

    // === Step 6: Extract table rows using regex ===
    console.log('📋 Step 6: Extracting table rows...');
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

    const records = [];
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
            continue; // Skip province total row
          }
          records.push({
            district: rawDistrict,
            household_count: parseNumber(cells[1]),
            total_updated_households: parseNumber(cells[12]),
            total_updated_area_rai: parseNumber(cells[14]),
          });
        }
      }
    }

    console.log(`📊 Found ${records.length} data rows`);

    console.log('\n🔍 Parsed districts data:');
    records.forEach((r) => {
      console.log(
        `  - ${r.district}: ครัวเรือน=${r.household_count}, ปรับปรุงสะสม=${r.total_updated_households}, พื้นที่ไร่=${r.total_updated_area_rai}`
      );
    });

    // Validation Checks
    if (records.length !== 7) {
      throw new Error(
        `Validation failed: Expected 7 districts, but found ${records.length}`
      );
    }

    records.forEach((r) => {
      if (!r.district)
        throw new Error('Validation failed: District name is empty');
      if (r.household_count === null)
        throw new Error(
          `Validation failed: household_count is null for ${r.district}`
        );
    });

    console.log(
      '\n✅ TEST PASSED: Scraper successfully logged in, navigated, scraped, and validated 7 districts data!'
    );
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exitCode = 1;
  }
}

main();
