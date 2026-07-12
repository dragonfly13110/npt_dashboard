import { PUBLIC_TABLES } from '../line-ai/tools.js';

const DISTRICTS = [
  'เมืองนครปฐม',
  'กำแพงแสน',
  'นครชัยศรี',
  'ดอนตูม',
  'บางเลน',
  'สามพราน',
  'พุทธมณฑล',
];

const TOPICS = [
  { re: /อากาศ|ฝน|อุณหภูมิ/, tools: ['latest_weather'], tables: ['daily_weather'] },
  { re: /จุดความร้อน|ไฟป่า|PM\s*2\.5|ฝุ่น/i, tools: ['fire_hotspots'], tables: ['fire_hotspots'] },
  { re: /โรคพืช|แมลงศัตรู|ระบาด|พยากรณ์โรค/, tools: ['disease_forecast'], tables: ['ai_disease_forecasts'] },
  { re: /วิสาหกิจชุมชน/, tools: ['area_summary'], tables: ['community_enterprises'], farmerGroupType: 'community_enterprise' },
  { re: /กลุ่มแม่บ้าน/, tools: ['area_summary'], tables: ['housewife_farmer_groups'], farmerGroupType: 'housewife' },
  { re: /ยุวเกษตรกร|young smart farmer/i, tools: ['area_summary'], tables: ['young_farmer_groups_detailed'], farmerGroupType: 'young_farmer' },
  { re: /แปลงใหญ่/, tools: ['global_search'], tables: ['large_plots'] },
  { re: /GAP|อินทรีย์|มาตรฐาน|ใบรับรอง/i, tools: ['global_search'], tables: ['certifications'] },
];

// ponytail: keyword routing keeps landing requests to one model call; add semantic retrieval only if misses are measured.

const GENERIC_TERMS = new Set([
  'นครปฐม',
  'จังหวัดนครปฐม',
  'ข้อมูล',
  'เกษตร',
  'มีไหม',
  'เท่าไร',
  'อย่างไร',
]);

export function getLandingQueryContext(question) {
  const text = String(question || '').trim();
  const topic = TOPICS.find(({ re }) => re.test(text));
  if (!topic) return { tools: [], tables: [], searchTerms: [], context: {} };

  const district = DISTRICTS.find((name) => text.includes(name)) || null;
  const quotedTerms = [...text.matchAll(/["“]([^"”]+)["”]/g)].map((m) => m[1]);
  const remainder = text
    .replace(/[ฯ,.!?\d]/g, ' ')
    .replace(district || '__no_district__', ' ')
    .replace(/แปลงใหญ่|วิสาหกิจชุมชน|กลุ่มแม่บ้าน|ยุวเกษตรกร|อากาศ|ฝน|อุณหภูมิ|จุดความร้อน|ไฟป่า|ฝุ่น|โรคพืช|แมลงศัตรู|ระบาด|พยากรณ์โรค|GAP|อินทรีย์|มาตรฐาน|ใบรับรอง|ใน|ของ|ที่|มี|กี่|กลุ่ม/gi, ' ');
  const words = remainder
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(
      (word) =>
        word.length >= 2 &&
        !GENERIC_TERMS.has(word) &&
        !TOPICS.some(({ re }) => re.test(word))
    );

  return {
    tools: topic.tools,
    tables: topic.tables.filter((table) => PUBLIC_TABLES.includes(table)),
    searchTerms: [...new Set([...quotedTerms, ...words, district].filter(Boolean))].slice(0, 5),
    context: {
      ...(district ? { district } : {}),
      ...(topic.farmerGroupType ? { farmerGroupType: topic.farmerGroupType } : {}),
      ...(topic.tools.includes('area_summary') ? { areaScope: district ? 'district' : 'province' } : {}),
    },
  };
}
