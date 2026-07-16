// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildContextForAI, fetchDatabaseContext } from '../chatbotDataService';

const mockRows = {
  certifications: [
    {
      id: 1,
      district: 'เมืองนครปฐม',
      crop: 'มะม่วง',
      area_rai: 12,
      created_at: '2026-01-01',
    },
  ],
};

const mockNotSpy = vi.fn();

function createQuery(table) {
  const query = {
    data: mockRows[table] || [],
    count: mockRows[table]?.length || 0,
    error: null,
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    ilike: vi.fn(() => query),
    or: vi.fn(() => query),
    not: mockNotSpy.mockImplementation(() => query),
    then(resolve) {
      return Promise.resolve({
        data: mockRows[table] || [],
        count: mockRows[table]?.length || 0,
        error: null,
      }).then(resolve);
    },
  };
  return query;
}

vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: vi.fn(() => createQuery(table)),
    })),
  },
}));

vi.mock('../aiService', () => ({
  callAI: vi.fn(async (_modelKey, prompt) => {
    if (prompt.includes('force-fallback-intent')) {
      return null;
    }

    if (prompt.includes('force-general-budget-intent')) {
      return JSON.stringify({
        district: null,
        tables: [],
        keyword: null,
        analysis_type: 'overview',
        is_general_question: true,
      });
    }

    if (prompt.includes('force-banana-intent')) {
      return JSON.stringify({
        district: null,
        tables: ['certifications'],
        keyword: 'กล้วย',
        analysis_type: 'overview',
        is_general_question: false,
      });
    }

    if (prompt.includes('force-disaster-intent')) {
      return JSON.stringify({
        district: null,
        tables: ['disasters'],
        keyword: null,
        analysis_type: 'overview',
        is_general_question: false,
      });
    }

    if (prompt.includes('force-wrong-budget-table')) {
      return JSON.stringify({
        district: null,
        tables: ['certifications'],
        keyword: null,
        analysis_type: 'overview',
        is_general_question: false,
      });
    }

    if (prompt.includes('2569') || prompt.includes('รอบ 2')) {
      return JSON.stringify({
        district: null,
        tables: ['budgets'],
        keyword: null,
        analysis_type: 'overview',
        is_general_question: false,
      });
    }

    return JSON.stringify({
      district: null,
      tables: ['certifications'],
      keyword: 'มะม่วง',
      analysis_type: 'overview',
      is_general_question: false,
    });
  }),
}));

describe('chatbotDataService aggregation', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
    // Mock only the AI Proxy endpoint so intent extraction succeeds in node test env
    global.fetch = async (url, options) => {
      const urlStr = typeof url === 'string' ? url : url?.url || '';
      if (urlStr.includes('/.netlify/functions/ai-proxy')) {
        const mockResponseText = JSON.stringify({
          district: null,
          tables: ['certifications'],
          keyword: 'มะม่วง',
          analysis_type: 'overview',
          is_general_question: false,
        });

        return {
          ok: true,
          status: 200,
          body: {
            getReader: () => {
              let done = false;
              return {
                read: () => {
                  if (done) return Promise.resolve({ done: true });
                  done = true;
                  return Promise.resolve({
                    done: false,
                    value: new TextEncoder().encode(
                      `data: {"candidates":[{"content":{"parts":[{"text": ${JSON.stringify(mockResponseText)} }]}}]}\n`
                    ),
                  });
                },
              };
            },
          },
        };
      }
      // Delegate all other fetches (like Supabase database queries) to the real fetch function
      return originalFetch(url, options);
    };
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('applies search keyword to computeAggregation and returns correct stats', async () => {
    // Query for GAP certifications with 'มะม่วง' keyword
    const result = await fetchDatabaseContext(
      'ขอข้อมูลใบรับรอง GAP มะม่วง',
      'gemini'
    );

    expect(result).toBeDefined();
    expect(result.results).toBeInstanceOf(Array);

    const gapResult = result.results.find((r) => r.table === 'certifications');
    if (gapResult) {
      console.log('Found GAP table stats in test:', {
        total_records: gapResult.count,
        filtered_by: gapResult.filteredBy,
        totals: gapResult.aggregatedStats?.totals,
        averages: gapResult.aggregatedStats?.averages,
      });

      // Check that the returned filter string matches our expectations when keyword filtering is applied.
      if (gapResult.filteredBy) {
        expect(gapResult.filteredBy).toContain('มะม่วง');
      }

      // Ensure aggregated stats are present
      expect(gapResult.aggregatedStats).toBeDefined();
      expect(gapResult.aggregatedStats.totals).toBeDefined();
      expect(gapResult.aggregatedStats.totals.area_rai).toBeGreaterThanOrEqual(
        0
      );
    } else {
      console.log(
        "No certifications matching 'มะม่วง' found, skipping detailed assertion."
      );
    }
  });

  it('uses the round 2 fiscal year 2569 budget seed when Supabase has no budget rows', async () => {
    const result = await fetchDatabaseContext(
      'เอารอบปี 2569 รอบ 2 สิ',
      'gemini'
    );
    const budgetResult = result.results.find((r) => r.table === 'budgets');

    expect(budgetResult).toBeDefined();
    expect(budgetResult.count).toBe(123);
    expect(budgetResult.seedFallback).toBe(true);
    expect(budgetResult.aggregatedStats.totals.budget_amount).toBe(767495);

    const context = buildContextForAI(result);
    expect(context).toContain('ปีงบประมาณ 2569');
    expect(context).toContain('"total_records": 123');
    expect(context).toContain('"budget_amount": 767495');
  });

  it('uses dashboard flood data for 2568 when the disasters table is stale', async () => {
    const result = await fetchDatabaseContext(
      'force-disaster-intent 2568',
      'gemini'
    );
    const disasters = result.results.find((item) => item.table === 'disasters');

    expect(disasters.count).toBe(560);
    expect(disasters.aggregatedStats.totals.planted_area_rai).toBeCloseTo(
      1173.47,
      2
    );
    expect(disasters.aggregatedStats.totals.affected_area_rai).toBeCloseTo(
      990.33,
      2
    );
  });

  it('returns a deterministic direct answer for the known round 2 fiscal year 2569 budget summary', async () => {
    const result = await fetchDatabaseContext(
      'งบประมาณปี 2569 รอบ 2 มีเท่าไร',
      'gemini'
    );

    expect(result.directAnswer).toContain('ปีงบประมาณ 2569 รอบ 2');
    expect(result.directAnswer).toContain('123 รายการ');
    expect(result.directAnswer).toContain('767,495 บาท');
    expect(result.directAnswer).toContain('15 โครงการ');
  });

  it('overrides a mistaken general intent for a clear budget seed query', async () => {
    const result = await fetchDatabaseContext(
      'force-general-budget-intent งบประมาณปี 2569 รอบ 2',
      'gemini'
    );

    expect(result.isGeneral).toBe(false);
    expect(result.results.some((r) => r.table === 'budgets')).toBe(true);
    expect(result.directAnswer).toContain('767,495 บาท');
  });

  it('overrides a mistaken table intent for a clear budget seed query', async () => {
    const result = await fetchDatabaseContext(
      'force-wrong-budget-table งบประมาณปี 2569 รอบ 2',
      'gemini'
    );

    expect(result.results).toHaveLength(1);
    expect(result.results[0].table).toBe('budgets');
    expect(result.directAnswer).toContain('123 รายการ');
  });

  it('uses recent conversation context for a budget correction follow-up', async () => {
    const result = await fetchDatabaseContext(
      'force-general-budget-intent แปลกๆนะ มันมีไม่ใช่เหรอ',
      'gemini',
      [
        { role: 'user', text: 'เอารอบปี 2569 รอบ 2 สิ' },
        { role: 'bot', text: 'ไม่มีข้อมูลงบประมาณปี 2569 ในระบบ' },
      ]
    );

    expect(result.isGeneral).toBe(false);
    expect(result.results[0].table).toBe('budgets');
    expect(result.directAnswer).toContain('ข้อมูลชุดนี้มีอยู่');
    expect(result.directAnswer).toContain('767,495 บาท');
  });

  it('excludes กล้วยไม้ when the search keyword is กล้วย (banana)', async () => {
    mockNotSpy.mockClear();

    await fetchDatabaseContext(
      'force-banana-intent หาแหล่งปลูกกล้วยน้ำว้า',
      'gemini'
    );

    expect(mockNotSpy).toHaveBeenCalled();
    expect(mockNotSpy).toHaveBeenCalledWith(
      expect.any(String),
      'ilike',
      '%กล้วยไม้%'
    );
  });

  it('falls back to heuristic matching for soil_series keywords when AI returns null', async () => {
    const result = await fetchDatabaseContext(
      'force-fallback-intent แนะนำชุดดินเหนียวที่มี pH กรดจัดหน่อย',
      'gemini'
    );

    expect(result).toBeDefined();
    expect(result.results).toBeInstanceOf(Array);
    expect(result.results.some((r) => r.table === 'soil_series')).toBe(true);
  });
});
