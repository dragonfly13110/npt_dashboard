import fs from 'node:fs';
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

const rawPlots = [
  { row_number: 1, district: 'เมืองนครปฐม', subdistrict: 'ดอนยายหอม', village_no: 4, owner_name: 'นายอรรถพันธ์ บุญเรือง', zone: '47P', coord_x: 617356, coord_y: 1522123, crop_type: 'มะม่วง', variety: 'เขียวเสวย', planted_area_rai: 15, planting_date: '2007-01-01', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ไม่ระบุ' },
  { row_number: 2, district: 'เมืองนครปฐม', subdistrict: 'หนองปากโลง', village_no: 9, owner_name: 'นาย นิธินันท์ พิพิธคุณานันท์', zone: '47P', coord_x: 606309, coord_y: 1533779, crop_type: 'มะเขือเปราะ', variety: 'เจ้าพระยา', planted_area_rai: 3, planting_date: '1968-03-10', plot_type: 'ศจช.', crop_status: 'ไม่ระบุ' },
  { row_number: 3, district: 'เมืองนครปฐม', subdistrict: 'หนองงูเหลือม', village_no: 3, owner_name: 'นาย สมเจตน์ มงคลรัตนาสิทธิ์', zone: '47P', coord_x: 604250, coord_y: 1539051, crop_type: 'อ้อย', variety: 'อ้อยโรงงาน', planted_area_rai: 9, planting_date: '2025-02-21', plot_type: 'ศจช.', crop_status: 'ไม่ระบุ' },
  { row_number: 4, district: 'เมืองนครปฐม', subdistrict: 'ทัพหลวง', village_no: 9, owner_name: 'นาง ปราณีตศิลป จิตรสังวรณ์', zone: '47P', coord_x: 607588, coord_y: 1535230, crop_type: 'อ้อย', variety: 'อ้อยโรงงาน', planted_area_rai: 13, planting_date: '2025-02-20', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ไม่ระบุ' },
  { row_number: 5, district: 'เมืองนครปฐม', subdistrict: 'สามควายเผือก', village_no: 8, owner_name: 'นายสุพจน์ พยุง', zone: '47P', coord_x: 620384, coord_y: 1532935, crop_type: 'ผักคะน้า', variety: 'คะน้า', planted_area_rai: 2, planting_date: '1968-01-10', plot_type: 'ศจช.', crop_status: 'ไม่ระบุ' },
  { row_number: 6, district: 'เมืองนครปฐม', subdistrict: 'บ้านยาง', village_no: 6, owner_name: 'นางสาวศศิประภา แพ่งผล', zone: '47P', coord_x: 597662, coord_y: 1533388, crop_type: 'กล้วย', variety: 'กล้วยน้ำว้า', planted_area_rai: 5, planting_date: '1963-01-01', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ไม่ระบุ' },
  { row_number: 7, district: 'บางเลน', subdistrict: 'ไทรงาม', village_no: 4, owner_name: 'นางนิศาภัทร์ พึ่งประชา', zone: '47P', coord_x: 631361, coord_y: 1557748, crop_type: 'ผัก', variety: 'ผักแขยง', planted_area_rai: 2, planting_date: '2024-01-01', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ไม่ระบุ' },
  { row_number: 8, district: 'บางเลน', subdistrict: 'ดอนตูม', village_no: 5, owner_name: 'นาย สันทัศน์ ชินวงศ์พรม', zone: '47P', coord_x: 619990, coord_y: 1560404, crop_type: 'มะพร้าว', variety: 'มะพร้าวอ่อน', planted_area_rai: 5, planting_date: '2016-01-01', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ไม่ระบุ' },
  { row_number: 9, district: 'บางเลน', subdistrict: 'นิลเพชร', village_no: 8, owner_name: 'นายประยงค์ บุญชอบ', zone: '47P', coord_x: 637619, coord_y: 1559744, crop_type: 'บัวบก', variety: 'บัวบก', planted_area_rai: 0.5, planting_date: '2024-01-01', plot_type: 'ศจช.', crop_status: 'ไม่ระบุ' },
  { row_number: 10, district: 'บางเลน', subdistrict: 'นราภิรมย์', village_no: 4, owner_name: 'นางสาวอรทัย เอี๊ยวเจริญ', zone: '47P', coord_x: 636993, coord_y: 1542051, crop_type: 'ผักชีฝรั่ง', variety: 'ผักชีฝรั่ง', planted_area_rai: 2, planting_date: '2024-03-03', plot_type: 'ศจช.', crop_status: 'ไม่ระบุ' },
  { row_number: 11, district: 'บางเลน', subdistrict: 'บางเลน', village_no: 10, owner_name: 'นางสาวคณึง ศรีสุขหู้', zone: '47P', coord_x: 629535, coord_y: 1551646, crop_type: 'มะพร้าว', variety: 'มะพร้าวอ่อน', planted_area_rai: 8, planting_date: '2016-01-01', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ไม่ระบุ' },
  { row_number: 12, district: 'บางเลน', subdistrict: 'บางปลา', village_no: 1, owner_name: 'นาง วาสนา แสงสุขดี', zone: '47P', coord_x: 626916, coord_y: 1542774, crop_type: 'ไทร', variety: 'ไทร', planted_area_rai: 8, planting_date: '2024-05-01', plot_type: 'พืชมูลค่าสูง', crop_status: 'ไม่ระบุ' },
  { row_number: 13, district: 'กำแพงแสน', subdistrict: 'สระพัฒนา', village_no: 9, owner_name: 'นายสมชาย ตั้งมานะสิริ', zone: '47P', coord_x: 605294, coord_y: 1558395, crop_type: 'อ้อย', variety: 'อ้อยโรงงาน', planted_area_rai: 24, planting_date: '2025-01-27', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ปกติ' },
  { row_number: 14, district: 'กำแพงแสน', subdistrict: 'กระตีบ', village_no: 4, owner_name: 'นายชัยวัฒน์ แดงดอนไพร', zone: '47P', coord_x: 604336, coord_y: 1560217, crop_type: 'อ้อย', variety: 'อ้อยโรงงาน', planted_area_rai: 11, planting_date: '2025-01-27', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ปกติ' },
  { row_number: 15, district: 'กำแพงแสน', subdistrict: 'สระสี่มุม', village_no: 8, owner_name: 'นายสมศักดิ์ แจ่มแสงงาม', zone: '47P', coord_x: 607789, coord_y: 1552378, crop_type: 'อ้อย', variety: 'อ้อยโรงงาน', planted_area_rai: 4.25, planting_date: '2025-11-03', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ปกติ' },
  { row_number: 16, district: 'กำแพงแสน', subdistrict: 'ทุ่งลูกนก', village_no: 11, owner_name: 'นายสันติ ยี่ชวน', zone: '47P', coord_x: 595014, coord_y: 1549227, crop_type: 'ข้าวโพดฝักอ่อน', variety: 'ข้าวโพดฝักอ่อน', planted_area_rai: 5, planting_date: '2025-09-11', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ปกติ' },
  { row_number: 17, district: 'กำแพงแสน', subdistrict: 'หนองกระทุ่ม', village_no: 4, owner_name: 'นายวันชนะ วงษ์พรพันธุ์', zone: '47P', coord_x: 602360, coord_y: 1550048, crop_type: 'อ้อย', variety: 'อ้อยโรงงาน', planted_area_rai: 6, planting_date: '2025-01-15', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ปกติ' },
  { row_number: 18, district: 'กำแพงแสน', subdistrict: 'ทุ่งขวาง', village_no: 7, owner_name: 'นายสมชาย มาตรทอง', zone: '47P', coord_x: 603358, coord_y: 1528537, crop_type: 'อ้อย', variety: 'อ้อยโรงงาน', planted_area_rai: 2, planting_date: '2025-01-15', plot_type: 'ศจช.', crop_status: 'ปกติ' },
  { row_number: 19, district: 'พุทธมณฑล', subdistrict: 'คลองโยง', village_no: 7, owner_name: 'นางสายรุ้ง นาสา', zone: '47P', coord_x: 637281, coord_y: 1537293, crop_type: 'มะพร้าว', variety: 'มะพร้าวน้ำหอม', planted_area_rai: 15, planting_date: '2015-01-05', plot_type: 'ศจช.', crop_status: 'ปกติ' },
  { row_number: 20, district: 'พุทธมณฑล', subdistrict: 'คลองโยง', village_no: 7, owner_name: 'น.ส. พยง พุ่มกำพล', zone: '47P', coord_x: 637889, coord_y: 1536382, crop_type: 'มะพร้าว', variety: 'มะพร้าวน้ำหอม', planted_area_rai: 13, planting_date: '2013-01-01', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ปกติ' },
  { row_number: 21, district: 'พุทธมณฑล', subdistrict: 'ศาลายา', village_no: 1, owner_name: 'นายเก่ง ศรีแก่นแก้ว', zone: '47P', coord_x: 639795, coord_y: 1528014, crop_type: 'มะม่วง', variety: 'น้ำดอกไม้', planted_area_rai: 5, planting_date: '2019-01-06', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ปกติ' },
  { row_number: 22, district: 'นครชัยศรี', subdistrict: 'แหลมบัว', village_no: 6, owner_name: 'นายสกล ญาติบรรทุง', zone: '47P', coord_x: 623330, coord_y: 1533622, crop_type: 'ข้าว', variety: '', planted_area_rai: 10, planting_date: null, plot_type: 'ศจช.', crop_status: 'พักแปลง' },
  { row_number: 23, district: 'นครชัยศรี', subdistrict: 'บางแก้ว', village_no: 3, owner_name: 'นางสาวสุภาวดี ทองสมเพียร', zone: '47P', coord_x: 626912, coord_y: 1520283, crop_type: 'ฝรั่ง', variety: 'ไร้เมล็ด', planted_area_rai: 2, planting_date: '2019-12-01', plot_type: 'พื้นที่เสี่ยง', crop_status: 'เก็บเกี่ยว' },
  { row_number: 24, district: 'นครชัยศรี', subdistrict: 'ห้วยพลู', village_no: 3, owner_name: 'นายวันดี วงศ์ศรี', zone: '47P', coord_x: 635487, coord_y: 1534252, crop_type: 'ส้มโอ', variety: 'ขาวน้ำผึ้ง', planted_area_rai: 5, planting_date: '2015-02-18', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ปกติ' },
  { row_number: 25, district: 'นครชัยศรี', subdistrict: 'วัดละมุด', village_no: 5, owner_name: 'นายสุราช โพธ์ศรี', zone: '47P', coord_x: 628158, coord_y: 1536244, crop_type: 'มะพร้าว', variety: 'มะพร้าวอ่อน', planted_area_rai: 5, planting_date: '2017-01-01', plot_type: 'พื้นที่เสี่ยง', crop_status: 'เก็บเกี่ยว' },
  { row_number: 26, district: 'นครชัยศรี', subdistrict: 'โคกพระเจดีย์', village_no: 5, owner_name: 'นางสาวอุมาวดี ฟุ้งขจร', zone: '47P', coord_x: 622591, coord_y: 1518705, crop_type: 'มะม่วง', variety: 'ฟ้าลั่น', planted_area_rai: 10, planting_date: '2017-01-01', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ปกติ' },
  { row_number: 27, district: 'นครชัยศรี', subdistrict: 'บางแก้วฟ้า', village_no: 1, owner_name: 'นายสุรพล แก้วแววน้อย', zone: '47P', coord_x: 632556, coord_y: 1536790, crop_type: 'กุยช่าย', variety: 'กุยช่าย', planted_area_rai: 3, planting_date: '2025-01-01', plot_type: 'พื้นที่เสี่ยง', crop_status: 'เก็บเกี่ยว' },
  { row_number: 28, district: 'ดอนตูม', subdistrict: 'ดอนรวก', village_no: 3, owner_name: 'นาย วีระชัย สุขแจ่ม', zone: '47P', coord_x: 621657, coord_y: 1536147, crop_type: 'มะเขือเปราะ', variety: 'เจ้าพระยา', planted_area_rai: 0.5, planting_date: '2025-10-20', plot_type: 'ศจช.', crop_status: 'ปกติ' },
  { row_number: 29, district: 'ดอนตูม', subdistrict: 'ลำเหย', village_no: 14, owner_name: 'นายชัยนรินท์ ภูวดลแสงวิจิตร์', zone: '47P', coord_x: 610662, coord_y: 1541838, crop_type: 'กระชาย', variety: 'กระชาย', planted_area_rai: 0.75, planting_date: '2025-05-26', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ปกติ' },
  { row_number: 30, district: 'ดอนตูม', subdistrict: 'สามง่าม', village_no: 7, owner_name: 'น.ส. จุฬารัตน์ วงศ์ศรีนาค', zone: '47P', coord_x: 618470, coord_y: 1543274, crop_type: 'ข้าว', variety: 'กข.41', planted_area_rai: 5, planting_date: '2025-10-12', plot_type: 'พื้นที่เสี่ยง', crop_status: 'พักแปลง' },
  { row_number: 31, district: 'สามพราน', subdistrict: 'ตลาดจินดา', village_no: 5, owner_name: 'นายชัชวาลย์ ตรีพงษ์ศิลป์', zone: '47P', coord_x: 616672, coord_y: 1510177, crop_type: 'มะพร้าว', variety: 'มะพร้าวน้ำหอม', planted_area_rai: 8, planting_date: '2016-01-01', plot_type: 'ศจช.', crop_status: 'ปกติ' },
  { row_number: 32, district: 'สามพราน', subdistrict: 'ตลาดจินดา', village_no: 2, owner_name: 'นายสราวุธ มณีกล่ำ', zone: '47P', coord_x: 617575, coord_y: 1514533, crop_type: 'มะพร้าว', variety: 'มะพร้าวน้ำหอม', planted_area_rai: 5, planting_date: '2022-02-01', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ปกติ' },
  { row_number: 33, district: 'สามพราน', subdistrict: 'คลองจินดา', village_no: 1, owner_name: 'นายชาตรี เต็กสงวน', zone: '47P', coord_x: 626438, coord_y: 1513946, crop_type: 'ชมพู่', variety: 'ทับทิมจันทร์', planted_area_rai: 4, planting_date: '2018-05-01', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ปกติ' },
  { row_number: 34, district: 'สามพราน', subdistrict: 'กระทุ่มล้ม', village_no: 1, owner_name: 'นายอุดม เพ็งทับ', zone: '47P', coord_x: 642403, coord_y: 1520013, crop_type: 'ข้าว', variety: 'กข41', planted_area_rai: 4, planting_date: '2024-05-07', plot_type: 'พื้นที่เสี่ยง', crop_status: 'พักแปลง' },
  { row_number: 35, district: 'สามพราน', subdistrict: 'ไร่ขิง', village_no: 3, owner_name: 'นายประกิต สุนประชา', zone: '47P', coord_x: 636458, coord_y: 1520686, crop_type: 'ส้มโอ', variety: 'ขาวน้ำผึ้ง', planted_area_rai: 2, planting_date: '2018-05-01', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ปกติ' },
  { row_number: 36, district: 'สามพราน', subdistrict: 'บางช้าง', village_no: 7, owner_name: 'นายมนตรี บุญกระสินธ์', zone: '47P', coord_x: 629462, coord_y: 1513244, crop_type: 'ฝรั่ง', variety: 'หงษ์เป่าสือ', planted_area_rai: 4, planting_date: '2020-09-01', plot_type: 'พื้นที่เสี่ยง', crop_status: 'ปกติ' }
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

    console.log("Generating and seeding real forecast_plots...");
    const records = rawPlots.map((plot) => {
        return {
            row_number: plot.row_number,
            province: 'นครปฐม',
            district: plot.district,
            subdistrict: plot.subdistrict,
            owner_name: plot.owner_name,
            crop_type: plot.crop_type,
            variety: plot.variety,
            planted_area_rai: plot.planted_area_rai,
            crop_status: plot.crop_status,
            coord_x: plot.coord_x,
            coord_y: plot.coord_y,
            planting_date: plot.planting_date,
            plot_type: plot.plot_type,
            village_no: plot.village_no,
            zone: plot.zone
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
    console.log(`Seeded ${records.length} real forecast plots successfully!`);
}

main().catch(console.error);
