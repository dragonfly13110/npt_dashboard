import fs from 'node:fs';
import process from 'node:process';
import path from 'node:path';
import XLSX from 'xlsx';
import utm from 'utm';

// Helper to read .env file
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

// SQL formatting helpers
function sqlString(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNumber(value) {
  return value === null || value === undefined || value === '' ? 'NULL' : String(value);
}

// Name cleaning helper
function cleanName(name) {
  if (!name) return '';
  return String(name)
    .replace(/\s+/g, '') // remove spaces
    .replace(/^(นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.|นาย\s*นาย)/g, '') // remove prefixes
    .replace(/เรือน/g, 'เรือง')
    .replace(/โพธ์/g, 'โพธิ์')
    .replace(/คณึง/g, 'คนึง')
    .trim();
}

function cleanLocation(loc) {
  if (!loc) return '';
  return String(loc).trim().replace(/\s+/g, '');
}

// Thai date parser
const THAI_MONTHS = {
  'ม.ค.': '01', 'ก.พ.': '02', 'มี.ค.': '03', 'เม.ย.': '04',
  'พ.ค.': '05', 'มิ.ย.': '06', 'ก.ค.': '07', 'ส.ค.': '08',
  'ก.ย.': '09', 'ต.ค.': '10', 'พ.ย.': '11', 'ธ.ค.': '12'
};

function parseThaiDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  const parts = str.split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = THAI_MONTHS[parts[1]] || '01';
    let year = parseInt(parts[2], 10);
    if (year > 2400) year -= 543;
    return `${year}-${month}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  return null;
}

// Call Supabase SQL API
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

async function main() {
  const env = { ...readEnv(), ...process.env };
  const projectRef = env.SUPABASE_PROJECT_REF;
  const accessToken = env.SUPABASE_ACCESS_TOKEN;

  if (!projectRef || !accessToken) {
    throw new Error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN in env');
  }

  // 1. Fetch current database records to match metadata
  console.log('Fetching existing forecast plots from database...');
  const currentDbRes = await runQuery(projectRef, accessToken, 'SELECT * FROM forecast_plots;');
  const dbRows = currentDbRes || [];
  console.log(`Found ${dbRows.length} existing rows in DB.`);

  // 2. Read the Excel file
  const filePath = 'e:/coding/npt_dashboard/1.ข้อมูลแปลงติดตามสถานการณ์การระบาดศัตรูพ.xls';
  console.log(`Reading Excel file: ${filePath}`);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const excelRows = XLSX.utils.sheet_to_json(worksheet);
  console.log(`Parsed ${excelRows.length} rows from Excel.`);

  // 3. Process and match each row
  const parsedRecords = [];
  let matchedCount = 0;

  excelRows.forEach((row, idx) => {
    const excelName = row['ชื่อ-นามสกุล'];
    const excelNameClean = cleanName(excelName);
    const excelSubClean = cleanLocation(row['ตำบล']);
    const excelDistClean = cleanLocation(row['อำเภอ']);

    // Attempt to match in DB
    const match = dbRows.find(dbRow => {
      const dbNameClean = cleanName(dbRow.owner_name);
      const dbSubClean = cleanLocation(dbRow.subdistrict);
      const dbDistClean = cleanLocation(dbRow.district);

      // Rule 1: Exact cleaned name match
      if (dbNameClean === excelNameClean) return true;

      // Rule 2: Cleaned name similarity + location match
      if (dbSubClean === excelSubClean && dbDistClean === excelDistClean) {
        if (dbNameClean.substring(0, 5) === excelNameClean.substring(0, 5) ||
            dbNameClean.includes(excelNameClean) ||
            excelNameClean.includes(dbNameClean)) {
          return true;
        }
      }
      return false;
    });

    let planted_area_rai = null;
    let crop_status = 'ไม่ระบุ';

    if (match) {
      matchedCount++;
      // Copy existing values
      planted_area_rai = match.planted_area_rai !== null ? parseFloat(match.planted_area_rai) : null;
      crop_status = match.crop_status || 'ไม่ระบุ';
    }

    // Convert coords to UTM
    let coord_x = null;
    let coord_y = null;
    let zone = '47P';

    if (row['ละติจูด'] && row['ลองจิจูด']) {
      const lat = parseFloat(row['ละติจูด']);
      const lng = parseFloat(row['ลองจิจูด']);
      if (!isNaN(lat) && !isNaN(lng)) {
        try {
          // Adjust for decimal shift typos in Excel if latitude is less than 5
          let correctedLat = lat;
          if (lat < 5) {
            correctedLat = lat * 10;
            console.log(`[Corrected Lat Shift] Row ${row['ลำดับ']} (${excelName}): ${lat} -> ${correctedLat}`);
          }
          const converted = utm.fromLatLon(correctedLat, lng);
          coord_x = Math.round(converted.easting);
          coord_y = Math.round(converted.northing);
          zone = `${converted.zoneNum}${converted.zoneLetter}`;
        } catch (e) {
          console.error(`Error converting coords for Row ${row['ลำดับ']} (${excelName}):`, e.message);
        }
      }
    }

    // Date
    const planting_date = parseThaiDate(row['วันที่ปลูก']);

    // Plot Type Mapping
    let plot_type = 'ไม่ระบุ';
    const excelPlotType = String(row['ประเภทแปลง'] || '').trim();
    if (excelPlotType === 'แปลงพื้นที่เสี่ยง') {
      plot_type = 'พื้นที่เสี่ยง';
    } else if (excelPlotType === 'แปลง ศจช.') {
      plot_type = 'ศจช.';
    } else if (excelPlotType === 'แปลงอื่นๆ') {
      plot_type = 'ไม่ระบุ';
    } else if (excelPlotType === 'พืชมูลค่าสูง') {
      plot_type = 'พืชมูลค่าสูง';
    }

    parsedRecords.push({
      row_number: parseInt(row['ลำดับ'], 10) || (idx + 1),
      province: String(row['จังหวัด'] || 'นครปฐม').trim(),
      district: String(row['อำเภอ'] || '').trim(),
      subdistrict: String(row['ตำบล'] || '').trim(),
      village_no: row['หมู่'] ? parseInt(row['หมู่'], 10) : null,
      owner_name: excelName ? String(excelName).trim() : '',
      zone: zone,
      coord_x: coord_x,
      coord_y: coord_y,
      crop_type: row['ชนิด'] ? String(row['ชนิด']).trim() : '',
      variety: row['พันธุ์'] ? String(row['พันธุ์']).trim() : '',
      planted_area_rai: planted_area_rai,
      planting_date: planting_date,
      plot_type: plot_type,
      crop_status: crop_status
    });
  });

  console.log(`Matching complete. Matched ${matchedCount} / ${excelRows.length} rows.`);

  // 4. Delete existing rows
  console.log('Clearing existing rows in forecast_plots...');
  await runQuery(projectRef, accessToken, 'DELETE FROM forecast_plots;');
  console.log('Existing rows cleared.');

  // 5. Insert new records
  console.log('Inserting 62 records into forecast_plots...');
  const columns = [
    'row_number', 'province', 'district', 'subdistrict', 'village_no',
    'owner_name', 'zone', 'coord_x', 'coord_y', 'crop_type',
    'variety', 'planted_area_rai', 'planting_date', 'plot_type', 'crop_status'
  ];

  const values = parsedRecords.map(r => `(${[
    sqlNumber(r.row_number),
    sqlString(r.province),
    sqlString(r.district),
    sqlString(r.subdistrict),
    sqlNumber(r.village_no),
    sqlString(r.owner_name),
    sqlString(r.zone),
    sqlNumber(r.coord_x),
    sqlNumber(r.coord_y),
    sqlString(r.crop_type),
    sqlString(r.variety),
    sqlNumber(r.planted_area_rai),
    sqlString(r.planting_date),
    sqlString(r.plot_type),
    sqlString(r.crop_status)
  ].join(', ')})`);

  // Batch insert SQL
  const insertSql = `
    INSERT INTO forecast_plots (${columns.join(', ')})
    VALUES ${values.join(',\n')};
  `;

  await runQuery(projectRef, accessToken, insertSql);
  console.log(`Successfully updated database! Imported ${parsedRecords.length} records.`);
}

main().catch(console.error);
