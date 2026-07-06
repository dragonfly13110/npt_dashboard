import budgetSeed from '../data/budgetRound2_2569.json';

export const BUDGET_SEED_YEAR = Number(budgetSeed?.meta?.fiscalYear || 2569);
export const BUDGET_SEED_ROUND = Number(budgetSeed?.meta?.round || 2);
const BUDGET_SEED_SOURCE =
  budgetSeed?.meta?.sourceFile || 'budgetRound2_2569.json';
const formatThaiNumber = (value) => Number(value || 0).toLocaleString('th-TH');
export function parseBudgetNotes(notes) {
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

export function queryMentionsBudgetSeedPeriod(query) {
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

export function isClearBudgetSeedConversation(query, chatHistory = []) {
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

export function hasBudgetSeedPeriod(rows) {
  return rows.some((row) => {
    const notes = parseBudgetNotes(row.notes);
    return (
      Number(row.fiscal_year || notes.fiscalYear) === BUDGET_SEED_YEAR &&
      Number(row.budget_round || notes.round) === BUDGET_SEED_ROUND
    );
  });
}
export function mergeBudgetSeedRows(rows, { force = false } = {}) {
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

export function summarizeBudgetRows(rows) {
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

export function buildBudgetDirectAnswer({
  query,
  results,
  forceBudgetSeed = false,
}) {
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

export const budgetSeedMeta = budgetSeed.meta;
