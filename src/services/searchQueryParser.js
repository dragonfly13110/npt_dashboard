const DISTRICTS = [
  'เมืองนครปฐม',
  'กำแพงแสน',
  'นครชัยศรี',
  'ดอนตูม',
  'บางเลน',
  'สามพราน',
  'พุทธมณฑล',
];

const CROPS = ['ข้าว', 'กล้วยไม้', 'กล้วย', 'มะพร้าว', 'ผัก', 'มะม่วง'];

const TABLE_HINTS = [
  { terms: ['งบ', 'งบประมาณ'], tables: ['budgets'] },
  { terms: ['gap', 'มาตรฐาน'], tables: ['certifications'] },
  { terms: ['ดิน', 'ชุดดิน'], tables: ['soil_series'] },
  {
    terms: ['โรค', 'แมลง', 'พยากรณ์'],
    tables: ['ai_disease_forecasts', 'forecast_plots'],
  },
  { terms: ['แปลงใหญ่'], tables: ['large_plots'] },
  { terms: ['วิสาหกิจ'], tables: ['community_enterprises'] },
  { terms: ['ครุภัณฑ์', 'พัสดุ', 'ทรัพย์สิน'], tables: ['assets'] },
];

const unique = (values) => [...new Set(values.filter(Boolean))];

export function parseSearchQuery(query = '') {
  const raw = String(query || '').trim();
  const lower = raw.toLowerCase();
  const years = unique((raw.match(/\b25\d{2}\b/g) || []).map(Number));
  const districts = DISTRICTS.filter((district) => raw.includes(district));
  const crops = CROPS.filter((crop) => raw.includes(crop));
  const tableHints = unique(
    TABLE_HINTS.flatMap(({ terms, tables }) =>
      terms.some((term) => lower.includes(term.toLowerCase())) ? tables : []
    )
  );

  const consumed = unique([
    ...districts,
    ...years.map(String),
    ...TABLE_HINTS.flatMap(({ terms }) => terms),
  ]);
  const terms = unique(
    raw
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 2)
      .filter((part) => !consumed.some((value) => part === value))
  );

  return { raw, terms, districts, crops, years, tableHints };
}
