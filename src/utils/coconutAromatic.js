export const COCONUT_ROUND_START = '2026-06-01';

export const DISTRICT_SUBDISTRICTS = {
  นครชัยศรี: [
    'ขุนแก้ว',
    'โคกพระเจดีย์',
    'งิ้วราย',
    'ดอนแฝก',
    'ท่ากระชับ',
    'ท่าตำหนัก',
    'ท่าพระยา',
    'ไทยาวาส',
    'บางกระเบา',
    'บางพระ',
    'บางแก้ว',
    'บางแก้วฟ้า',
    'วัดแค',
    'ศรีษะทอง',
    'ห้วยพลู',
    'ห้วยจรเข้',
    'นครชัยศรี',
    'แหลมบัว',
  ],
  สามพราน: [
    'กระทุ่มล้ม',
    'คลองใหม่',
    'คลองจินดา',
    'ตลาดจินดา',
    'ทรงคนอง',
    'ท่าข้าม',
    'ท่าตลาด',
    'บางกระทึก',
    'บางช้าง',
    'บางเตย',
    'บ้านใหม่',
    'ยายชา',
    'สามพราน',
    'หอมเกร็ด',
    'ไร่ขิง',
    'อ้อมใหญ่',
  ],
};

export function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateCoconutRecord(input = {}) {
  const ownAreaRai = toNumber(input.own_area_rai);
  const rentedAreaRai = toNumber(input.rented_area_rai);
  const productionCostPerRai = toNumber(input.production_cost_per_rai);
  const standardFruitPerRai = toNumber(input.standard_fruit_per_rai);
  const standardPricePerFruit = toNumber(input.standard_price_per_fruit);
  const smallFruitPerRai = toNumber(input.small_fruit_per_rai);
  const smallPricePerFruit = toNumber(input.small_price_per_fruit);
  const plantedAreaRai = ownAreaRai + rentedAreaRai;
  const totalFruitPerRai = standardFruitPerRai + smallFruitPerRai;
  const standardIncomePerRai = standardFruitPerRai * standardPricePerFruit;
  const smallIncomePerRai = smallFruitPerRai * smallPricePerFruit;
  const incomePerRai = standardIncomePerRai + smallIncomePerRai;

  return {
    planted_area_rai: round2(plantedAreaRai),
    cost_per_fruit: round2(productionCostPerRai / 12),
    standard_percent: totalFruitPerRai ? round2((standardFruitPerRai / totalFruitPerRai) * 100) : 0,
    standard_income_per_rai: round2(standardIncomePerRai),
    small_percent: totalFruitPerRai ? round2((smallFruitPerRai / totalFruitPerRai) * 100) : 0,
    small_income_per_rai: round2(smallIncomePerRai),
    total_fruit_per_rai: round2(totalFruitPerRai),
    income_per_rai: round2(incomePerRai),
    total_income: round2(incomePerRai * plantedAreaRai),
  };
}

export function getCoconutRound(dateValue, startDate = COCONUT_ROUND_START) {
  const date = parseLocalDate(dateValue);
  const start = parseLocalDate(startDate);
  if (!date || !start || date < start) return null;
  const days = Math.floor((date - start) / 86400000);
  const roundNo = Math.floor(days / 20) + 1;
  const roundStart = addDays(start, (roundNo - 1) * 20);
  const roundEnd = addDays(roundStart, 19);
  return {
    round_no: roundNo,
    round_label: `รอบที่ ${roundNo}`,
    round_start_date: formatLocalDate(roundStart),
    round_end_date: formatLocalDate(roundEnd),
  };
}

export function normalizeImportedCoconutRow(row = {}) {
  const recordDate = row.record_date || row['วันที่จัดเก็บ'] || COCONUT_ROUND_START;
  const base = {
    record_date: recordDate,
    farmer_code: row.farmer_code || row['รหัส'] || '',
    prefix: row.prefix || row['คำนำหน้า'] || '',
    farmer_name: row.farmer_name || row['ชื่อ - สกุล'] || '',
    house_no: row.house_no || row['ที่อยู่เลขที่'] || '',
    village_no: row.village_no || row['หมู่ที่'] || '',
    subdistrict: row.subdistrict || row['ตำบล'] || '',
    district: row.district || row['อำเภอ'] || '',
    own_area_rai: toNumber(row.own_area_rai || row['พื้นที่ตนเอง /ครอบครัว (ไร่)']),
    rented_area_rai: toNumber(row.rented_area_rai || row['พื้นที่เช่า (ไร่)']),
    production_cost_per_rai: toNumber(row.production_cost_per_rai || row['ต้นทุนการผลิตเฉลี่ยต่อไร่(บาท/ไร่/ปี)']),
    standard_fruit_per_rai: toNumber(row.standard_fruit_per_rai || row['จำนวนผลมาตรฐาน(ผล / ไร่)']),
    standard_price_per_fruit: toNumber(row.standard_price_per_fruit || row['ราคาเฉลี่ยต่อผลมาตรฐาน(บาท)']),
    small_fruit_per_rai: toNumber(row.small_fruit_per_rai || row['จำนวนผลเล็ก(ผล / ไร่)']),
    small_price_per_fruit: toNumber(row.small_price_per_fruit || row['ราคาเฉลี่ยต่อผลเล็ก(บาท)']),
  };
  return { ...base, ...getCoconutRound(recordDate), ...calculateCoconutRecord(base) };
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function parseLocalDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
