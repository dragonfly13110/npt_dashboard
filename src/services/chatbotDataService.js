import { supabase } from '../supabaseClient';
import { callAI } from './aiService';
import {
  TABLE_CONFIG,
  getCategoryColumns,
  getDatasetSelectColumns,
  getDistrictColumn,
  getNumericColumns,
  getSearchColumns,
  listDatasetKeys,
} from '../domain/datasetCatalog';
import budgetSeed from '../data/budgetRound2_2569.json';

const BUDGET_SEED_YEAR = Number(budgetSeed?.meta?.fiscalYear || 2569);
const BUDGET_SEED_ROUND = Number(budgetSeed?.meta?.round || 2);
const BUDGET_SEED_SOURCE =
  budgetSeed?.meta?.sourceFile || 'budgetRound2_2569.json';
const formatThaiNumber = (value) => Number(value || 0).toLocaleString('th-TH');

function parseBudgetNotes(notes) {
  if (!notes || typeof notes !== 'string') return {};
  try {
    const parsed = JSON.parse(notes);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeBudgetSeedRow(row) {
  const detail = {
    ...row,
    fiscalYear: Number(row.fiscalYear || BUDGET_SEED_YEAR),
    round: Number(row.round || BUDGET_SEED_ROUND),
    sourceFile: row.sourceFile || BUDGET_SEED_SOURCE,
    sourceId: row.sourceId || row.id,
  };

  return {
    id: `seed-budget-${detail.sourceId}`,
    project_name:
      [detail.project, detail.activity].filter(Boolean).join(' / ') ||
      'รายการงบประมาณ',
    fiscal_year: detail.fiscalYear,
    budget_round: detail.round,
    budget_source:
      detail.plan || `งบรอบ ${detail.round} ปี ${detail.fiscalYear}`,
    budget_amount: Number(detail.budget || 0),
    spent_amount: Number(detail.spentAmount || 0),
    status: detail.status || 'กำลังดำเนินการ',
    notes: JSON.stringify(detail),
    source_file: detail.sourceFile,
    source_row_id: detail.sourceId,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    _seedFallback: true,
  };
}

function queryMentionsBudgetSeedPeriod(query) {
  const text = String(query || '').toLowerCase();
  return (
    text.includes(String(BUDGET_SEED_YEAR)) ||
    text.includes(`ปี ${BUDGET_SEED_YEAR}`) ||
    text.includes(`รอบ ${BUDGET_SEED_ROUND}`) ||
    text.includes(`รอบที่ ${BUDGET_SEED_ROUND}`)
  );
}

function queryMentionsBudgetDataset(query) {
  const text = String(query || '').toLowerCase();
  return (
    text.includes('งบ') ||
    text.includes('งบประมาณ') ||
    text.includes('โครงการ') ||
    text.includes('แผนใช้จ่าย')
  );
}

function isClearBudgetSeedQuery(query) {
  const text = String(query || '').toLowerCase();
  return (
    queryMentionsBudgetSeedPeriod(query) &&
    (queryMentionsBudgetDataset(query) || text.includes('รอบ'))
  );
}

function isBudgetCorrectionFollowUp(query) {
  const text = String(query || '').toLowerCase();
  return (
    text.includes('มีไม่ใช่') ||
    text.includes('มันมี') ||
    text.includes('แปลก') ||
    text.includes('ไม่ใช่เหรอ') ||
    text.includes('เมื่อกี้') ||
    text.includes('แน่ใจ')
  );
}

function isClearBudgetSeedConversation(query, chatHistory = []) {
  if (isClearBudgetSeedQuery(query)) return true;
  if (!isBudgetCorrectionFollowUp(query)) return false;

  const recentContext = chatHistory
    .slice(-6)
    .map((m) => m?.text || '')
    .join('\n');
  return (
    queryMentionsBudgetDataset(recentContext) &&
    queryMentionsBudgetSeedPeriod(recentContext)
  );
}

function hasBudgetSeedPeriod(rows) {
  return rows.some((row) => {
    const notes = parseBudgetNotes(row.notes);
    return (
      Number(row.fiscal_year || notes.fiscalYear) === BUDGET_SEED_YEAR &&
      Number(row.budget_round || notes.round) === BUDGET_SEED_ROUND
    );
  });
}

function mergeBudgetSeedRows(rows, { force = false } = {}) {
  if (!force && hasBudgetSeedPeriod(rows)) return rows;

  const existingKeys = new Set(
    rows.map((row) => {
      const notes = parseBudgetNotes(row.notes);
      return [
        row.fiscal_year || notes.fiscalYear,
        row.budget_round || notes.round,
        row.source_file || notes.sourceFile,
        row.source_row_id || notes.sourceId,
      ].join('|');
    })
  );

  const seedRows = (budgetSeed?.rows || [])
    .map(normalizeBudgetSeedRow)
    .filter((row) => {
      const key = [
        row.fiscal_year,
        row.budget_round,
        row.source_file,
        row.source_row_id,
      ].join('|');
      return !existingKeys.has(key);
    });

  return force ? seedRows : [...seedRows, ...rows];
}

function summarizeBudgetRows(rows) {
  if (!rows.length) return null;

  const stats = {
    total_rows: rows.length,
    totals: { budget_amount: 0, spent_amount: 0 },
    averages: { budget_amount: 0, spent_amount: 0 },
    by_district: {},
  };

  rows.forEach((row) => {
    const notes = parseBudgetNotes(row.notes);
    const district = notes.district || 'ไม่ระบุ';
    const budget = Number(row.budget_amount ?? notes.budget ?? 0) || 0;
    const spent = Number(row.spent_amount ?? notes.spentAmount ?? 0) || 0;

    if (!stats.by_district[district]) {
      stats.by_district[district] = {
        count: 0,
        budget_amount: 0,
        spent_amount: 0,
      };
    }

    stats.totals.budget_amount += budget;
    stats.totals.spent_amount += spent;
    stats.by_district[district].count += 1;
    stats.by_district[district].budget_amount += budget;
    stats.by_district[district].spent_amount += spent;
  });

  stats.averages.budget_amount =
    Math.round((stats.totals.budget_amount / rows.length) * 100) / 100;
  stats.averages.spent_amount =
    Math.round((stats.totals.spent_amount / rows.length) * 100) / 100;
  stats.district_percentages = {};
  Object.entries(stats.by_district).forEach(([district, value]) => {
    stats.district_percentages[district] = {
      count: value.count,
      budget_amount:
        stats.totals.budget_amount > 0
          ? Math.round(
              (value.budget_amount / stats.totals.budget_amount) * 10000
            ) / 100
          : 0,
      spent_amount:
        stats.totals.spent_amount > 0
          ? Math.round(
              (value.spent_amount / stats.totals.spent_amount) * 10000
            ) / 100
          : 0,
    };
  });
  stats.rankings = {
    budget_amount: {
      top: Object.entries(stats.by_district)
        .map(([district, value]) => ({ district, value: value.budget_amount }))
        .sort((a, b) => b.value - a.value)[0],
    },
  };

  return stats;
}

function buildDirectAnswer({ query, results, forceBudgetSeed = false }) {
  const budgetResult = results.find((r) => r.table === 'budgets');
  if (
    budgetResult?.seedFallback &&
    (forceBudgetSeed || queryMentionsBudgetSeedPeriod(query))
  ) {
    const totalBudget =
      budgetResult.aggregatedStats?.totals?.budget_amount ??
      budgetSeed.meta.totalBudget;
    return [
      `มีข้อมูลงบประมาณปีงบประมาณ ${BUDGET_SEED_YEAR} รอบ ${BUDGET_SEED_ROUND} ในระบบครับ`,
      '',
      `- จำนวนรายการ: ${formatThaiNumber(budgetResult.count || budgetSeed.meta.totalRows)} รายการ`,
      `- จำนวนโครงการ: ${formatThaiNumber(budgetSeed.meta.totalProjects)} โครงการ`,
      `- งบประมาณรวม: ${formatThaiNumber(totalBudget)} บาท`,
      `- แหล่งข้อมูล: ${BUDGET_SEED_SOURCE}`,
      '',
      'สรุปคือข้อมูลชุดนี้มีอยู่ ไม่ใช่ข้อมูลปี 2568 ครับ',
    ].join('\n');
  }

  return null;
}

export async function extractIntent(
  query,
  modelKey,
  chatHistory = [],
  signal = null
) {
  const tableList = Object.entries(TABLE_CONFIG)
    .map(([k, v]) => `${k}: ${v.descTh}`)
    .join('\n');

  // Make AI aware of the FULL previous conversation to resolve pronouns and complex follow-up logic
  const recentHistory = chatHistory
    .map((m) => `${m.role === 'bot' ? 'AI' : 'User'}: ${m.text}`)
    .join('\n');

  const prompt = `คุณคือสุดยอด AI ผู้เชี่ยวชาญด้านการสกัดข้อมูลสำหรับฐานข้อมูลการเกษตรไทย (จ.นครปฐม)
ให้สกัดพารามิเตอร์การค้นหาแบบแม่นยำขั้นสุดจากคำถาม *ใหม่* ของผู้ใช้ โดยอ้างอิงจากบริบทการสนทนา *ทั้งหมด*
ตอบกลับเป็นรูปแบบ JSON ที่ถูกต้องเท่านั้น ห้ามครอบด้วย markdown code blocks เด็ดขาด

ตารางข้อมูลที่มีในระบบ (Available tables):
${tableList}

ข้อควรระวังสำคัญ - ตาราง agricultural_areas มี *คอลัมน์* ตามนี้ (ไม่ใช่ค่าข้อมูลสำหรับใช้ค้นหา):
district, total_area_rai, agri_crop_area_rai, farmer_households, rice_in_season_rai, rice_off_season_rai, field_crops_rai, horticulture_rai, fruit_trees_rai, vegetables_rai, flowers_rai, herbs_spices_rai

รายชื่ออำเภอ: เมืองนครปฐม, กำแพงแสน, นครชัยศรี, ดอนตูม, บางเลน, สามพราน, พุทธมณฑล

รูปแบบการส่งค่ากลับ (Return format):
{
  "district": "ชื่ออำเภอ หรือ null",
  "tables": ["ชื่อตาราง"] หรือ ["all"] สำหรับคำถามถามภาพรวม,
  "keyword": "ชื่อบุคคล หรือชื่อสิ่งที่ต้องการกรองข้อมูลแบบเฉพาะเจาะจงมากๆ หรือ null",
  "analysis_type": "overview | comparison | detail | ranking | correlation",
  "is_general_question": false
}

กฎต่างๆ (Rules):
- ใช้ ["all"] *เฉพาะ* คำขอที่เป็นภาพรวมหรือสรุปแบบกว้างๆ เท่านั้น
- ตัวอย่างเช่น "พื้นที่เกษตรทั้งหมดมีเท่าไหร่" หรือ "ปลูกข้าวกี่ไร่" → ให้คืนค่าเป็น tables: ["agricultural_areas"], keyword: null (เนื่องจากข้อมูลข้าวเป็นชื่อคอลัมน์ ไม่ใช่ค่าในระดับแถว)
- *ห้าม* ใส่ keyword เป็นหมวดหมู่พืชผลแบบกว้างๆ เช่น ข้าว, ผัก, ไม้ผล, พืชไร่, สมุนไพร ในกรณีที่ผู้ใช้ถามดึงข้อมูลจากตาราง agricultural_areas — เพราะคำเหล่านี้คือ *ชื่อคอลัมน์* ไม่ใช่ค่าสำหรับใช้ค้นหา
- keyword ควรเป็นค่าที่ใช้ค้นหาแบบเฉพาะเจาะจงมากๆ เท่านั้น เช่น ชื่อบุคคล (เช่น "สมชาย"), ชื่อพันธุ์พืชเฉพาะ (เช่น "ส้มโอ"), หรือชื่อกลุ่มวิสาหกิจ
- keyword *ห้าม* มีชื่อตาราง, ชื่ออำเภอ, หรือคำแสดงคำถาม ปะปนอยู่รวมในนั้น
- analysis_type: "overview"=ภาพรวม, "comparison"=เปรียบเทียบ, "detail"=เจาะลึก, "ranking"=จัดอันดับ, "correlation"=หาความสัมพันธ์
- ถ้าคำถามมีคำว่า "เปรียบเทียบ" "อำเภอไหนมากสุด" "จัดอันดับ" → analysis_type: "comparison" หรือ "ranking"
- ถ้าคำถามถามความสัมพันธ์ระหว่างข้อมูล → analysis_type: "correlation", tables: ตารางที่เกี่ยวข้องทั้งหมด
- ถ้าคำถามระบุว่า "สร้างรายงาน" หรือ "ทำรายงาน" → analysis_type: "detail", tables: ["all"] หรือบางตารางที่เกี่ยวข้อง
- ถ้าคำถามเกี่ยวกับ "นโยบาย" (Policy) หรือแนวทางภาครัฐ → analysis_type: "overview", tables: ["all"], keyword: null แต่ is_general_question อาจเป็น false หรือ true ขึ้นอยู่กับว่ามันโยงกับข้อมูลง่ายๆ หรือไม่ (ถ้าเป็นความรู้นโยบายลอยๆ ให้ is_general_question: true)
- is_general_question: ให้เป็น true สำหรับการพูดคุยทักทาย, คำถามความรู้ทั่วไป, คำถามนโยบายที่ไม่ได้อิงกับตัวเลขพื้นที่, หรือคำถามที่ไม่มีส่วนเกี่ยวข้องใดๆ กับฐานข้อมูลเลย
- ตอบกลับมาเป็นโครงสร้าง raw JSON เพียงอย่างเดียว ห้ามมีการจัดรูปแบบ markdown ใดๆ (ห้ามมี \`\`\`json)
- ❗ สำคัญ: ถ้าผู้ใช้ถามต่อเนื่องจากบริบทเดิม (เช่น "แล้วอำเภอ X ล่ะ?" "อันไหนมากสุด?" "ช่วยเปรียบเทียบให้หน่อย") → ให้อ้างอิงจาก *บริบทการสนทนาก่อนหน้า* เพื่อระบุ tables และ analysis_type ให้ถูกต้อง

--- ตัวอย่างการสกัด (FEW-SHOT EXAMPLES) ---
Q: "มีเกษตรกรทั้งหมดกี่ครัวเรือน"
A: {"district":null,"tables":["farmer_registry"],"keyword":null,"analysis_type":"overview","is_general_question":false}

Q: "สร้างรายงานสรุปผลการเกษตรประจำจังหวัด"
A: {"district":null,"tables":["all"],"keyword":null,"analysis_type":"detail","is_general_question":false}

Q: "นโยบายภาครัฐที่ช่วยเหลือเกษตรกรมีอะไรบ้าง"
A: {"district":null,"tables":[],"keyword":null,"analysis_type":"overview","is_general_question":true}

Q: "พื้นที่เกษตรกับจำนวนเกษตรกรสัมพันธ์กันไหม"
A: {"district":null,"tables":["agricultural_areas","farmer_registry"],"keyword":null,"analysis_type":"correlation","is_general_question":false}

Q: "สวัสดีครับ"
A: {"district":null,"tables":[],"keyword":null,"analysis_type":"overview","is_general_question":true}

Q: "ค้นหาชื่อ สมชาย ใน GAP"
A: {"district":null,"tables":["certifications"],"keyword":"สมชาย","analysis_type":"detail","is_general_question":false}
--- จบตัวอย่าง ---

--- บริบทการสนทนาล่าสุด (RECENT CONVERSATION CONTEXT) ---
${recentHistory || 'ไม่มีบริบทก่อนหน้า'}
--- สิ้นสุดบริบทการสนทนา (END RECENT CONVERSATION) ---

จงสกัดพารามิเตอร์การค้นหาจากคำถาม *ใหม่* ของผู้ใช้ข้อความนี้: "${query}"`;

  try {
    // Send recent chat history to AI so it can resolve follow-up references
    const historyForIntent = chatHistory
      .slice(-8)
      .concat([{ role: 'user', text: query }]);
    const result = await callAI(
      modelKey,
      prompt,
      historyForIntent,
      null,
      null,
      signal
    );
    if (result) {
      const jsonMatch = result.match(/```(?:json)?\\s*([\\s\\S]*?)```/);
      const cleanJson = jsonMatch ? jsonMatch[1].trim() : result.trim();
      const jsonStart = cleanJson.indexOf('{');
      const jsonEnd = cleanJson.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        return JSON.parse(cleanJson.substring(jsonStart, jsonEnd + 1));
      }
    }
  } catch (e) {
    console.error('Intent extraction failed:', e);
  }
  return null;
}

/**
 * Compute server-side aggregation stats for numeric columns via Supabase
 * This prevents sending thousands of raw rows and lets AI use pre-computed numbers
 */
async function computeAggregation(
  table,
  distCol,
  matchedDistrict,
  searchKeyword
) {
  const numCols = getNumericColumns(table);
  if (!numCols || numCols.length === 0) return null;

  try {
    // Build a select string that computes SUM for each numeric column
    // We do this by fetching all rows for the relevant columns and aggregating client-side
    // (Supabase REST API doesn't support SQL aggregation directly)
    let query = supabase.from(table).select([distCol, ...numCols].join(','));

    if (matchedDistrict) {
      query = query.ilike(distCol, `%${matchedDistrict}%`);
    }

    const searchCols = getSearchColumns(table);
    if (searchKeyword && searchCols.length > 0) {
      const cols = searchCols;
      const orString = cols
        .map((c) => `${c}.ilike.%${searchKeyword}%`)
        .join(',');
      query = query.or(orString);
      if (
        searchKeyword.includes('กล้วย') &&
        !searchKeyword.includes('กล้วยไม้')
      ) {
        cols.forEach((c) => {
          query = query.not(c, 'ilike', '%กล้วยไม้%');
        });
      }
    }

    const { data, error } = await query.limit(10000);
    if (error) {
      console.error(
        `[Aggregation Error] table=${table} district=${matchedDistrict} keyword=${searchKeyword}:`,
        error
      );
    }
    if (data && data.length === 0) {
      console.warn(
        `[Aggregation Empty] table=${table} district=${matchedDistrict} keyword=${searchKeyword}`
      );
    }
    if (error || !data || data.length === 0) return null;

    // Compute aggregation
    const stats = {
      total_rows: data.length,
      totals: {},
      averages: {},
      by_district: {},
    };

    // Initialize
    numCols.forEach((col) => {
      stats.totals[col] = 0;
      stats.averages[col] = 0;
    });

    // Process rows
    data.forEach((row) => {
      const budgetNotes =
        table === 'budgets' ? parseBudgetNotes(row.notes) : null;
      const district = budgetNotes?.district || row[distCol] || 'ไม่ระบุ';
      if (!stats.by_district[district]) {
        stats.by_district[district] = { count: 0 };
        numCols.forEach((col) => {
          stats.by_district[district][col] = 0;
        });
      }
      stats.by_district[district].count++;

      numCols.forEach((col) => {
        const val = parseFloat(row[col]) || 0;
        stats.totals[col] += val;
        stats.by_district[district][col] += val;
      });
    });

    // Compute averages
    numCols.forEach((col) => {
      stats.averages[col] =
        data.length > 0
          ? Math.round((stats.totals[col] / data.length) * 100) / 100
          : 0;
    });

    // Compute percentages per district
    stats.district_percentages = {};
    Object.entries(stats.by_district).forEach(([dist, distData]) => {
      stats.district_percentages[dist] = { count: distData.count };
      numCols.forEach((col) => {
        const total = stats.totals[col];
        stats.district_percentages[dist][col] =
          total > 0 ? Math.round((distData[col] / total) * 10000) / 100 : 0;
      });
    });

    // Find top/bottom for key metrics
    stats.rankings = {};
    numCols.slice(0, 5).forEach((col) => {
      const sorted = Object.entries(stats.by_district)
        .map(([dist, d]) => ({ district: dist, value: d[col] }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value);
      if (sorted.length > 0) {
        stats.rankings[col] = {
          top: sorted[0],
          bottom: sorted[sorted.length - 1],
        };
      }
    });

    return stats;
  } catch (e) {
    console.error(`Aggregation failed for ${table}:`, e);
    return null;
  }
}

export async function fetchDatabaseContext(
  query,
  modelKey,
  chatHistory = [],
  signal = null
) {
  const intent = await extractIntent(query, modelKey, chatHistory, signal);
  const forceBudgetSeed = isClearBudgetSeedConversation(query, chatHistory);

  if (intent?.is_general_question && !forceBudgetSeed) {
    return { results: [], isOverview: false, isGeneral: true, query, intent };
  }

  let matchedDistrict = intent?.district || null;
  let searchKeyword = intent?.keyword || null;
  let matchedTables = [];
  let isOverview = false;
  const analysisType = intent?.analysis_type || 'overview';

  if (forceBudgetSeed) {
    matchedTables = ['budgets'];
  } else if (intent?.tables?.length > 0) {
    if (intent.tables.includes('all')) {
      matchedTables = listDatasetKeys();
      isOverview = true;
    } else {
      matchedTables = intent.tables.filter((t) => TABLE_CONFIG[t]);
    }
  }

  // Heuristic fallback
  if (matchedTables.length === 0) {
    const lowerQuery = query.toLowerCase();
    const tableKeywords = {
      agricultural_areas: [
        'พื้นที่',
        'เกษตร',
        'ไร่',
        'ข้าว',
        'พืช',
        'สวน',
        'นา',
      ],
      learning_centers: ['ศูนย์เรียนรู้', 'ศพก'],
      disasters: ['ภัย', 'น้ำท่วม', 'แล้ง', 'วาตภัย'],
      farmer_registry: ['ทะเบียน', 'เกษตรกร', 'ครัวเรือน'],
      large_plots: ['แปลงใหญ่', 'สินค้า'],
      certifications: ['gap', 'มาตรฐาน', 'ใบรับรอง', 'อินทรีย์'],
      crop_production: ['ผลผลิต', 'เก็บเกี่ยว', 'ตัน'],
      community_enterprises: ['วิสาหกิจ', 'ชุมชน'],
      smart_farmers: ['smart farmer', 'เกษตรกรรุ่นใหม่', 'young'],
      smart_farmer_sf: [
        'เกษตรกรปราดเปรื่อง',
        'smart farmer',
        'sf',
        'รายได้เกษตรกร',
        'กิจกรรมทางการเกษตร',
      ],
      young_smart_farmer_ysf: [
        'young smart farmer',
        'ysf',
        'เกษตรกรรุ่นใหม่',
        'รายได้ ysf',
        'กิจกรรม ysf',
      ],
      agricultural_career_groups: [
        'กลุ่มส่งเสริมอาชีพการเกษตร',
        'กสอ',
        'กลุ่มอาชีพ',
        'ทุนกลุ่ม',
        'รายได้กลุ่ม',
      ],
      farmer_groups: ['กลุ่มแม่บ้าน', 'ยุวเกษตรกร'],
      young_farmer_groups_detailed: [
        'ยุวเกษตรกร',
        'กยว',
        'กลุ่มยุว',
        'กลุ่มยุวเกษตรกร',
        'ศักยภาพกลุ่มยุว',
      ],
      farmer_institutes: ['สถาบัน', 'สหกรณ์'],
      agri_tourism: ['ท่องเที่ยว', 'ฟาร์มสเตย์'],
      forecast_plots: ['พยากรณ์', 'แมลง', 'ศัตรูพืช'],
      pest_centers: ['ศจช', 'ศัตรูพืชชุมชน'],
      plant_doctors: ['หมอพืช', 'หมอพืชชุมชน'],
      soil_fertilizer_centers: ['ศดปช', 'ดิน', 'ปุ๋ย'],
      soil_series: [
        'ชุดดิน',
        'กลุ่มชุดดิน',
        'เนื้อดิน',
        'ดินเหนียว',
        'ดินร่วน',
        'ความอุดมสมบูรณ์',
        'ph',
        'กรดจัด',
        'ดินเปรี้ยว',
      ],
      fire_hotspots: ['ไฟ', 'เผา', 'pm2.5', 'หมอกควัน'],
      daily_weather: [
        'สภาพอากาศ',
        'อุณหภูมิ',
        'ฝน',
        'ลม',
        'อากาศ',
        'ร้อน',
        'หนาว',
      ],
      budgets: [
        'งบ',
        'งบประมาณ',
        'โครงการ',
        'กิจกรรม',
        'แผนใช้จ่าย',
        'แผนดำเนินงาน',
        'ผู้รับผิดชอบ',
        'รอบ 2',
        '2569',
      ],
    };

    for (const [table, keywords] of Object.entries(tableKeywords)) {
      if (keywords.some((kw) => lowerQuery.includes(kw))) {
        matchedTables.push(table);
      }
    }

    if (matchedTables.length === 0) {
      matchedTables = listDatasetKeys();
      isOverview = true;
    }
  }

  // For comparison/correlation queries, ensure we pull multiple tables
  if (
    (analysisType === 'comparison' || analysisType === 'correlation') &&
    matchedTables.length < 2
  ) {
    // Add related tables for richer analysis
    const relatedGroups = {
      agricultural_areas: ['farmer_registry', 'crop_production'],
      farmer_registry: ['agricultural_areas', 'smart_farmers'],
      large_plots: ['certifications', 'crop_production'],
      smart_farmers: ['learning_centers', 'farmer_groups'],
      smart_farmer_sf: [
        'learning_centers',
        'farmer_institutes',
        'young_farmer_groups_detailed',
      ],
      young_smart_farmer_ysf: [
        'smart_farmer_sf',
        'farmer_institutes',
        'learning_centers',
      ],
      agricultural_career_groups: [
        'community_enterprises',
        'farmer_institutes',
        'young_farmer_groups_detailed',
      ],
      young_farmer_groups_detailed: ['smart_farmer_sf', 'farmer_institutes'],
      certifications: ['large_plots', 'crop_production'],
      disasters: ['agricultural_areas', 'farmer_registry'],
      soil_series: ['agricultural_areas', 'forecast_plots'],
    };
    const existing = new Set(matchedTables);
    matchedTables.forEach((t) => {
      (relatedGroups[t] || []).forEach((related) => {
        if (!existing.has(related)) {
          matchedTables.push(related);
          existing.add(related);
        }
      });
    });
  }

  const results = [];
  // Reduced from 2,000 to 200 for sample data — aggregation handles the heavy lifting now
  const sampleLimit = 200;

  // Process tables in parallel for speed
  const tablePromises = matchedTables.map(async (table) => {
    try {
      const distCol = getDistrictColumn(table);
      const searchCols = getSearchColumns(table, 'guest');
      const categoryCols = getCategoryColumns(table);
      const aiSelectColumns = getDatasetSelectColumns(table, { purpose: 'ai' });
      let usedKeyword = false;

      let countQuery = supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      let dataQuery = supabase
        .from(table)
        .select(aiSelectColumns)
        .order('created_at', { ascending: false })
        .limit(sampleLimit);

      if (signal) {
        countQuery = countQuery.abortSignal(signal);
        dataQuery = dataQuery.abortSignal(signal);
      }

      if (matchedDistrict) {
        countQuery = countQuery.ilike(distCol, `%${matchedDistrict}%`);
        dataQuery = dataQuery.ilike(distCol, `%${matchedDistrict}%`);
      }

      if (searchKeyword && searchCols.length > 0) {
        const cols = searchCols;
        const orString = cols
          .map((c) => `${c}.ilike.%${searchKeyword}%`)
          .join(',');
        try {
          countQuery = countQuery.or(orString);
          dataQuery = dataQuery.or(orString);
          if (
            searchKeyword.includes('กล้วย') &&
            !searchKeyword.includes('กล้วยไม้')
          ) {
            cols.forEach((c) => {
              countQuery = countQuery.not(c, 'ilike', '%กล้วยไม้%');
              dataQuery = dataQuery.not(c, 'ilike', '%กล้วยไม้%');
            });
          }
          usedKeyword = true;
        } catch {
          /* swallow */
        }
      }

      let { count, error: countError } = await countQuery;
      let sampleData = [];

      if (!countError && count === 0 && usedKeyword) {
        if (window?.console)
          console.log(
            `[Chatbot] Keyword "${searchKeyword}" returned 0 for ${table}, retrying without keyword...`
          );
        let fbCountQuery = supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        let fbDataQuery = supabase
          .from(table)
          .select(aiSelectColumns)
          .order('created_at', { ascending: false })
          .limit(sampleLimit);
        if (matchedDistrict) {
          fbCountQuery = fbCountQuery.ilike(distCol, `%${matchedDistrict}%`);
          fbDataQuery = fbDataQuery.ilike(distCol, `%${matchedDistrict}%`);
        }
        const fbResult = await fbCountQuery;
        count = fbResult.count || 0;
        countError = fbResult.error;
        if (!countError && count > 0) {
          const fbData = await fbDataQuery;
          sampleData = fbData.data || [];
        }
        usedKeyword = false;
      }

      if (countError) {
        const fb = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        count = fb.count || 0;
        if (count > 0) {
          const fbData = await supabase
            .from(table)
            .select(aiSelectColumns)
            .order('created_at', { ascending: false })
            .limit(sampleLimit);
          sampleData = fbData.data || [];
        }
      } else if (sampleData.length === 0) {
        if (count > 0) {
          const { data } = await dataQuery;
          sampleData = data || [];
        }
      }

      const usesBudgetSeed =
        table === 'budgets' &&
        forceBudgetSeed &&
        !hasBudgetSeedPeriod(sampleData);
      if (usesBudgetSeed) {
        sampleData = mergeBudgetSeedRows(sampleData, { force: true });
        count = sampleData.length;
      }

      // Compute server-side aggregation for numeric tables
      const aggregatedStats = usesBudgetSeed
        ? summarizeBudgetRows(sampleData)
        : await computeAggregation(
            table,
            distCol,
            matchedDistrict,
            usedKeyword ? searchKeyword : null
          );

      // District and Category summary (lightweight)
      let districtSummary = null;
      let categorySummary = null;
      try {
        let colsToSelect = [distCol];
        if (categoryCols.length > 0) {
          colsToSelect = [...colsToSelect, ...categoryCols];
        }
        let summaryQuery = supabase.from(table).select(colsToSelect.join(','));

        if (signal) {
          summaryQuery = summaryQuery.abortSignal(signal);
        }

        if (matchedDistrict) {
          summaryQuery = summaryQuery.ilike(distCol, `%${matchedDistrict}%`);
        }
        if (usedKeyword && searchKeyword && searchCols.length > 0) {
          const cols = searchCols;
          const orString = cols
            .map((c) => `${c}.ilike.%${searchKeyword}%`)
            .join(',');
          summaryQuery = summaryQuery.or(orString);
          if (
            searchKeyword.includes('กล้วย') &&
            !searchKeyword.includes('กล้วยไม้')
          ) {
            cols.forEach((c) => {
              summaryQuery = summaryQuery.not(c, 'ilike', '%กล้วยไม้%');
            });
          }
        }
        // Fetch up to 10000 rows for counting only
        const { data: summaryData } = await summaryQuery.limit(10000);
        if (summaryData && summaryData.length > 0) {
          const distCounts = {};
          const catCounts = {};
          if (categoryCols.length > 0) {
            categoryCols.forEach((c) => (catCounts[c] = {}));
          }

          summaryData.forEach((row) => {
            // District count
            const budgetNotes =
              table === 'budgets' ? parseBudgetNotes(row.notes) : null;
            const d = budgetNotes?.district || row[distCol] || 'ไม่ระบุ';
            distCounts[d] = (distCounts[d] || 0) + 1;

            // Category count
            if (categoryCols.length > 0) {
              categoryCols.forEach((c) => {
                const val = row[c] || 'ไม่ระบุ';
                catCounts[c][val] = (catCounts[c][val] || 0) + 1;
              });
            }
          });
          districtSummary = distCounts;
          if (categoryCols.length > 0) {
            categorySummary = catCounts;
          }
        }
      } catch {
        /* skip summary */
      }

      return {
        table,
        label: TABLE_CONFIG[table].label,
        icon: TABLE_CONFIG[table].icon,
        group: TABLE_CONFIG[table].group,
        count: count || 0,
        seedFallback: usesBudgetSeed,
        districtSummary,
        categorySummary,
        aggregatedStats,
        sample: sampleData.length > 0 ? sampleData : null,
        filteredBy:
          matchedDistrict ||
          (usedKeyword && searchKeyword ? `คำค้น "${searchKeyword}"` : null),
      };
    } catch {
      return null;
    }
  });

  const tableResults = await Promise.all(tablePromises);
  tableResults.forEach((r) => {
    if (r) results.push(r);
  });

  return {
    results,
    isOverview,
    isGeneral: false,
    query,
    intent,
    matchedDistrict,
    analysisType,
    directAnswer: buildDirectAnswer({ query, results, forceBudgetSeed }),
  };
}

export function buildContextForAI(analysis) {
  const { results, analysisType } = analysis;
  if (!results || results.length === 0) return 'ไม่พบข้อมูลในฐานข้อมูล';

  return JSON.stringify(
    results.map((r) => {
      const entry = {
        dataset: r.label,
        table_name: r.table,
        total_records: r.count,
        filtered_by: r.filteredBy || 'ไม่กรอง',
      };

      if (r.seedFallback && r.table === 'budgets') {
        entry._source_note = `ใช้ชุดข้อมูลงบประมาณ seed ที่ระบบ Dashboard ใช้อยู่: รอบ ${BUDGET_SEED_ROUND} ปีงบประมาณ ${BUDGET_SEED_YEAR}, ${budgetSeed.meta.totalRows} รายการ, ${budgetSeed.meta.totalProjects} โครงการ, งบรวม ${budgetSeed.meta.totalBudget} บาท`;
        entry.fiscal_year = BUDGET_SEED_YEAR;
        entry.budget_round = BUDGET_SEED_ROUND;
      }

      // Include aggregated stats (SUM, AVG, rankings, percentages by district)
      if (r.aggregatedStats) {
        entry.aggregated_stats = {
          _note:
            'PRE-COMPUTED AGGREGATION — ข้อมูลคำนวณจริงจาก Database ทั้งหมด ไม่ใช่จากตัวอย่าง ให้ใช้ตัวเลขเหล่านี้ในการวิเคราะห์เสมอ!',
          totals: r.aggregatedStats.totals,
          averages: r.aggregatedStats.averages,
          by_district: r.aggregatedStats.by_district,
          district_percentages: r.aggregatedStats.district_percentages,
          rankings: r.aggregatedStats.rankings,
        };
      }

      // Pre-calculated categorical distributions (exact counts)
      if (r.categorySummary && Object.keys(r.categorySummary).length > 0) {
        entry.category_distribution = r.categorySummary;
      }

      // Lightweight district summary if aggregatedStats isn't available
      if (r.districtSummary && !r.aggregatedStats) {
        entry.district_distribution = r.districtSummary;
      }

      if (entry.category_distribution || entry.district_distribution) {
        entry._stats_note = `การนับจำนวน 100% จากฐานข้อมูลทั้งหมด (${r.count} รายการ) ไม่ใช่แค่กลุ่มตัวอย่าง`;
      }

      // Only include limited sample records to save tokens
      // Smart limits: overview/ranking don't need many samples since aggregated_stats covers them
      const maxSampleForAI =
        analysisType === 'detail'
          ? 30
          : analysisType === 'comparison'
            ? 10
            : analysisType === 'overview'
              ? 5
              : analysisType === 'ranking'
                ? 5
                : 15;
      entry.sample_records = r.sample
        ? r.sample.slice(0, maxSampleForAI).map((s) => {
            const obj = {};
            for (const [key, val] of Object.entries(s)) {
              if (val === null || val === undefined || val === '') continue;
              if (['id', 'created_at', 'updated_at'].includes(key)) continue;
              if (
                key.includes('image') ||
                key.includes('url') ||
                key.includes('file') ||
                key.includes('path')
              )
                continue;
              obj[key] = val;
            }
            return obj;
          })
        : [];

      return entry;
    }),
    null,
    2
  );
}
