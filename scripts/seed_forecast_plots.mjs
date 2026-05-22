import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

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

function sqlString(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNumber(value) {
  return value === null || value === undefined || value === '' ? 'NULL' : String(value);
}

// Coordinate Solver Math (UTM Zone 47N)
function utmToLatLng(easting, northing, zone = 47, hemisphere = 'N') {
    if (!easting || !northing) return { lat: 0, lng: 0 };
    const northernHemisphere = hemisphere.toUpperCase() === 'N';
    let y = northing;
    if (!northernHemisphere) {
        y = 10000000 - northing;
    }
    const a = 6378137;           
    const e = 0.081819191;       
    const e1sq = 0.006739497;    
    const k0 = 0.9996;           
    const arc = y / k0;
    const mu = arc / (a * (1 - Math.pow(e, 2) / 4.0 - 3 * Math.pow(e, 4) / 64.0 - 5 * Math.pow(e, 6) / 256.0));
    const ei = (1 - Math.pow((1 - e * e), (1 / 2.0))) / (1 + Math.pow((1 - e * e), (1 / 2.0)));
    const ca = 3 * ei / 2 - 27 * Math.pow(ei, 3) / 32.0;
    const cb = 21 * Math.pow(ei, 2) / 16 - 55 * Math.pow(ei, 4) / 32;
    const cc = 151 * Math.pow(ei, 3) / 96;
    const cd = 1097 * Math.pow(ei, 4) / 512;
    const phi1 = mu + ca * Math.sin(2 * mu) + cb * Math.sin(4 * mu) + cc * Math.sin(6 * mu) + cd * Math.sin(8 * mu);
    const n0 = a / Math.pow((1 - Math.pow((e * Math.sin(phi1)), 2)), (1 / 2.0));
    const r0 = a * (1 - e * e) / Math.pow((1 - Math.pow((e * Math.sin(phi1)), 2)), (3 / 2.0));
    const fact1 = n0 * Math.tan(phi1) / r0;
    const _a1 = 500000 - easting;
    const dd0 = _a1 / (n0 * k0);
    const fact2 = dd0 * dd0 / 2;
    const t0 = Math.pow(Math.tan(phi1), 2);
    const Q0 = e1sq * Math.pow(Math.cos(phi1), 2);
    const fact3 = (5 + 3 * t0 + 10 * Q0 - 4 * Q0 * Q0 - 9 * e1sq) * Math.pow(dd0, 4) / 24;
    const fact4 = (61 + 90 * t0 + 298 * Q0 + 45 * t0 * t0 - 252 * e1sq - 3 * Q0 * Q0) * Math.pow(dd0, 6) / 720;
    const lof1 = _a1 / (n0 * k0);
    const lof2 = (1 + 2 * t0 + Q0) * Math.pow(dd0, 3) / 6.0;
    const lof3 = (5 - 2 * Q0 + 28 * t0 - 3 * Math.pow(Q0, 2) + 8 * e1sq + 24 * Math.pow(t0, 2)) * Math.pow(dd0, 5) / 120;
    const _a2 = (lof1 - lof2 + lof3) / Math.cos(phi1);
    const _a3 = _a2 * 180 / Math.PI;
    const lat = 180 * (phi1 - fact1 * (fact2 + fact3 + fact4)) / Math.PI;
    const lng = ((zone > 0) && (6 * zone - 183.0) || 3.0) - _a3;
    return {
        lat: northernHemisphere ? lat : -lat,
        lng: lng
    };
}

function latLngToUtm(targetLat, targetLng) {
    let easting = 600000;
    let northing = 1500000;
    for (let i = 0; i < 100; i++) {
        const current = utmToLatLng(easting, northing, 47, 'N');
        const errLat = targetLat - current.lat;
        const errLng = targetLng - current.lng;
        if (Math.abs(errLat) < 1e-6 && Math.abs(errLng) < 1e-6) break;
        northing += errLat * 111000;
        easting += errLng * 107800;
    }
    return { easting, northing };
}

const DISTRICT_CENTROIDS = {
    'เมืองนครปฐม': [13.82, 100.04],
    'กำแพงแสน': [14.01, 99.98],
    'บางเลน': [14.02, 100.17],
    'ดอนตูม': [13.98, 100.08],
    'นครชัยศรี': [13.80, 100.18],
    'สามพราน': [13.72, 100.22],
    'พุทธมณฑล': [13.78, 100.32],
};

const rawPlots = [
    { district: 'เมืองนครปฐม', subdistrict: 'สนามจันทร์', owner_name: 'สมชาย มั่นคง', crop_type: 'ข้าวนาปรัง', variety: 'กข43', planted_area_rai: 15, crop_status: 'กำลังเติบโต', latOffset: 0.015, lngOffset: -0.012 },
    { district: 'เมืองนครปฐม', subdistrict: 'นครปฐม', owner_name: 'สมพร รักดี', crop_type: 'อ้อยโรงงาน', variety: 'LK92-11', planted_area_rai: 35, crop_status: 'แตกกอ', latOffset: -0.010, lngOffset: 0.015 },
    { district: 'เมืองนครปฐม', subdistrict: 'หนองปากโลง', owner_name: 'นารี รุ่งเรือง', crop_type: 'ฝรั่ง', variety: 'กิมจู', planted_area_rai: 8, crop_status: 'เก็บเกี่ยวผลผลิต', latOffset: 0.005, lngOffset: 0.008 },
    { district: 'กำแพงแสน', subdistrict: 'กำแพงแสน', owner_name: 'บุญส่ง เจริญสุข', crop_type: 'ข้าวนาปี', variety: 'หอมมะลิ 105', planted_area_rai: 20, crop_status: 'แตกกอ', latOffset: 0.020, lngOffset: -0.015 },
    { district: 'กำแพงแสน', subdistrict: 'ทุ่งกระพังโหม', owner_name: 'มาลี สีสวย', crop_type: 'กล้วยไม้', variety: 'โจแดง', planted_area_rai: 12, crop_status: 'บำรุงต้น/ดอก', latOffset: -0.015, lngOffset: 0.020 },
    { district: 'บางเลน', subdistrict: 'บางเลน', owner_name: 'ประสิทธิ์ มีทอง', crop_type: 'ข้าวนาปรัง', variety: 'กข85', planted_area_rai: 40, crop_status: 'ใกล้เก็บเกี่ยว', latOffset: 0.010, lngOffset: 0.010 },
    { district: 'บางเลน', subdistrict: 'บางไทรป่า', owner_name: 'สุดา หอมกลิ่น', crop_type: 'ผักไฮโดรโปนิกส์', variety: 'กรีนโอ๊ค', planted_area_rai: 3, crop_status: 'ทยอยเก็บเกี่ยว', latOffset: -0.012, lngOffset: -0.018 },
    { district: 'ดอนตูม', subdistrict: 'สามง่าม', owner_name: 'วิชัย ใจดี', crop_type: 'มันสำปะหลัง', variety: 'ระยอง 72', planted_area_rai: 25, crop_status: 'สะสมอาหารในหัว', latOffset: 0.008, lngOffset: -0.010 },
    { district: 'ดอนตูม', subdistrict: 'ห้วยพระ', owner_name: 'สุวรรณ ทับทิม', crop_type: 'มะนาว', variety: 'แป้นพิจิตร', planted_area_rai: 6, crop_status: 'ติดผล/เจริญเติบโต', latOffset: -0.010, lngOffset: 0.008 },
    { district: 'นครชัยศรี', subdistrict: 'นครชัยศรี', owner_name: 'นิรันดร์ ยิ้มแย้ม', crop_type: 'ส้มโอ', variety: 'ขาวทองดี', planted_area_rai: 18, crop_status: 'บำรุงผลผลิต', latOffset: 0.012, lngOffset: 0.012 },
    { district: 'นครชัยศรี', subdistrict: 'ท่าตำหนัก', owner_name: 'จรรยา ศรีสุข', crop_type: 'ข้าวนาปรัง', variety: 'ปทุมธานี 1', planted_area_rai: 30, crop_status: 'ออกรวง', latOffset: -0.008, lngOffset: -0.008 },
    { district: 'สามพราน', subdistrict: 'ยายชา', owner_name: 'เอกชัย เกษตรดี', crop_type: 'ฝรั่ง', variety: 'หวานพิรุณ', planted_area_rai: 10, crop_status: 'ห่อผล/เตรียมเก็บ', latOffset: 0.008, lngOffset: -0.010 },
    { district: 'สามพราน', subdistrict: 'สามพราน', owner_name: 'ศิริพร ผลดี', crop_type: 'กล้วยไม้', variety: 'หวายคละสี', planted_area_rai: 14, crop_status: 'บำรุงช่อดอก', latOffset: -0.010, lngOffset: 0.012 },
    { district: 'พุทธมณฑล', subdistrict: 'ศาลายา', owner_name: 'พงษ์ศักดิ์ รักษ์ดิน', crop_type: 'ข้าวนาปี', variety: 'กข43', planted_area_rai: 22, crop_status: 'เพิ่งปักดำ', latOffset: 0.010, lngOffset: 0.010 },
    { district: 'พุทธมณฑล', subdistrict: 'คลองโยง', owner_name: 'รัตนา เกษตรใหม่', crop_type: 'บัวหลวง', variety: 'ปทุมปัทมา', planted_area_rai: 15, crop_status: 'เก็บเกี่ยวผลผลิต', latOffset: -0.005, lngOffset: -0.005 },
];

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
        throw new Error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN');
    }

    console.log("Setting RLS policies to allow public (anon) read access for forecast_plots...");
    const policySql = `
        DROP POLICY IF EXISTS "Allow authenticated read" ON forecast_plots;
        DROP POLICY IF EXISTS "Allow public read forecast plots" ON forecast_plots;
        CREATE POLICY "Allow public read forecast plots" ON forecast_plots
            FOR SELECT TO anon, authenticated USING (true);
    `;
    await runQuery(projectRef, accessToken, policySql);
    console.log("RLS policy updated successfully.");

    console.log("Clearing existing rows in forecast_plots...");
    await runQuery(projectRef, accessToken, "DELETE FROM forecast_plots;");
    console.log("Existing rows cleared.");

    console.log("Generating and seeding mock forecast_plots...");
    const records = rawPlots.map((plot, idx) => {
        const centroid = DISTRICT_CENTROIDS[plot.district];
        const lat = centroid[0] + plot.latOffset;
        const lng = centroid[1] + plot.lngOffset;
        const { easting, northing } = latLngToUtm(lat, lng);

        return {
            row_number: idx + 1,
            province: 'นครปฐม',
            district: plot.district,
            subdistrict: plot.subdistrict,
            owner_name: plot.owner_name,
            crop_type: plot.crop_type,
            variety: plot.variety,
            planted_area_rai: plot.planted_area_rai,
            crop_status: plot.crop_status,
            coord_x: easting,
            coord_y: northing,
            planting_date: '2026-02-15',
            plot_type: 'แปลงเกษตรทั่วไป',
            village_no: 1,
            zone: '47N'
        };
    });

    const columns = [
        'row_number',
        'province',
        'district',
        'subdistrict',
        'owner_name',
        'crop_type',
        'variety',
        'planted_area_rai',
        'crop_status',
        'coord_x',
        'coord_y',
        'planting_date',
        'plot_type',
        'village_no',
        'zone'
    ];

    const values = records.map(r => `(${[
        sqlNumber(r.row_number),
        sqlString(r.province),
        sqlString(r.district),
        sqlString(r.subdistrict),
        sqlString(r.owner_name),
        sqlString(r.crop_type),
        sqlString(r.variety),
        sqlNumber(r.planted_area_rai),
        sqlString(r.crop_status),
        sqlNumber(r.coord_x),
        sqlNumber(r.coord_y),
        sqlString(r.planting_date),
        sqlString(r.plot_type),
        sqlNumber(r.village_no),
        sqlString(r.zone)
    ].join(', ')})`);

    const insertSql = `
        INSERT INTO forecast_plots (${columns.join(', ')})
        VALUES ${values.join(',\n')};
    `;

    await runQuery(projectRef, accessToken, insertSql);
    console.log(`Seeded ${records.length} forecast plots successfully!`);
}

main().catch(console.error);
