export const INSTITUTE_V2_TYPES = [
  { key: 'smart_farmer_sf', label: 'Smart Farmer (SF)', unit: 'ราย', color: '#f97316' },
  { key: 'young_smart_farmer_ysf', label: 'Young Smart Farmer (YSF)', unit: 'ราย', color: '#22c55e' },
  { key: 'housewife_farmer_groups', label: 'กลุ่มแม่บ้านเกษตรกร', unit: 'กลุ่ม', color: '#ec4899' },
  { key: 'young_farmer_groups_detailed', label: 'กลุ่มยุวเกษตรกร', unit: 'กลุ่ม', color: '#3b82f6' },
  { key: 'agricultural_career_groups', label: 'กลุ่มส่งเสริมอาชีพ', unit: 'กลุ่ม', color: '#8b5cf6' },
];

const TYPE_BY_KEY = Object.fromEntries(INSTITUTE_V2_TYPES.map((type) => [type.key, type]));

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function cleanText(value, fallback = '-') {
  const text = String(value || '').trim();
  return text || fallback;
}

function createPersonRow(row, typeKey) {
  const type = TYPE_BY_KEY[typeKey];
  const sequence = row.sequence_no || row.record_code || row.id || '';
  const safeName = sequence ? `${type.label} #${sequence}` : `${type.label} (ไม่แสดงชื่อ)`;
  const productionArea = toNumber(row.farm_area_rai || row.production_area);
  return {
    id: `${typeKey}:${row.id || row.record_code || row.full_name}`,
    sourceId: row.id,
    typeKey,
    typeLabel: type.label,
    typeColor: type.color,
    unit: type.unit,
    year: row.data_year || row.year || null,
    name: safeName,
    district: cleanText(row.district, 'ไม่ระบุ'),
    subdistrict: cleanText(row.subdistrict, ''),
    activity: cleanText(row.agricultural_activity || row.main_activity || row.production_area, ''),
    standard: cleanText(row.production_standard, ''),
    status: cleanText(row.farmer_status || row.education, ''),
    metricValue: 1,
    metricLabel: 'ราย',
    members: 1,
    income: toNumber(row.annual_agri_income),
    productionArea,
    fund: 0,
  };
}

function createGroupRow(row, typeKey) {
  const type = TYPE_BY_KEY[typeKey];
  const members = toNumber(row.member_count);
  return {
    id: `${typeKey}:${row.id || row.record_code || row.group_name}`,
    sourceId: row.id,
    typeKey,
    typeLabel: type.label,
    typeColor: type.color,
    unit: type.unit,
    year: row.data_year || row.year || null,
    name: cleanText(row.group_name),
    district: cleanText(row.district, 'ไม่ระบุ'),
    subdistrict: cleanText(row.subdistrict, ''),
    activity: cleanText(row.activity || row.main_activity, ''),
    standard: cleanText(row.production_standard || row.potential_level, ''),
    status: cleanText(row.model_group || row.community_enterprise_registration, ''),
    metricValue: members,
    metricLabel: 'สมาชิก',
    members,
    income: toNumber(row.income),
    productionArea: 0,
    fund: toNumber(row.fund_management),
  };
}

export function createInstituteV2Rows({
  smartFarmers = [],
  youngSmartFarmers = [],
  housewifeGroups = [],
  youngFarmerGroups = [],
  careerGroups = [],
} = {}) {
  return [
    ...smartFarmers.map((row) => createPersonRow(row, 'smart_farmer_sf')),
    ...youngSmartFarmers.map((row) => createPersonRow(row, 'young_smart_farmer_ysf')),
    ...housewifeGroups.map((row) => createGroupRow(row, 'housewife_farmer_groups')),
    ...youngFarmerGroups.map((row) => createGroupRow(row, 'young_farmer_groups_detailed')),
    ...careerGroups.map((row) => createGroupRow(row, 'agricultural_career_groups')),
  ];
}

export function filterInstituteV2Rows(rows, { year = 'all', district = 'all', typeKey = 'all', search = '' } = {}) {
  const query = String(search || '').trim().toLowerCase();
  return rows.filter((row) => {
    if (year !== 'all' && row.year !== year) return false;
    if (district !== 'all' && row.district !== district) return false;
    if (typeKey !== 'all' && row.typeKey !== typeKey) return false;
    if (!query) return true;
    return [row.name, row.district, row.subdistrict, row.activity, row.typeLabel, row.standard, row.status]
      .some((value) => String(value || '').toLowerCase().includes(query));
  });
}

function summarizeBy(rows, key, limit = 20) {
  const map = new Map();
  rows.forEach((row) => {
    const name = row[key] || 'ไม่ระบุ';
    const current = map.get(name) || { name, count: 0, members: 0, income: 0, fund: 0 };
    current.count += 1;
    current.members += row.members || 0;
    current.income += row.income || 0;
    current.fund += row.fund || 0;
    map.set(name, current);
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, limit);
}

function countUnique(rows, key) {
  return new Set(rows.map((row) => row[key]).filter(Boolean)).size;
}

export function summarizeInstituteV2Rows(rows) {
  const totalMembers = rows.reduce((sum, row) => sum + (row.members || 0), 0);
  return {
    totalRows: rows.length,
    totalMembers,
    averageMembers: rows.length ? totalMembers / rows.length : 0,
    totalIncome: rows.reduce((sum, row) => sum + (row.income || 0), 0),
    totalFund: rows.reduce((sum, row) => sum + (row.fund || 0), 0),
    totalProductionArea: rows.reduce((sum, row) => sum + (row.productionArea || 0), 0),
    districtCount: countUnique(rows, 'district'),
    activityCount: countUnique(rows, 'activity'),
    standardCount: countUnique(rows, 'standard'),
    statusCount: countUnique(rows, 'status'),
    byType: summarizeBy(rows, 'typeLabel'),
    byDistrict: summarizeBy(rows, 'district'),
  };
}

export function getInstituteV2Options(rows) {
  const years = [...new Set(rows.map((row) => row.year).filter(Boolean))].sort((a, b) => b - a);
  const districts = [...new Set(rows.map((row) => row.district).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th'));
  return { years, districts, types: INSTITUTE_V2_TYPES };
}
