import { describe, expect, it, vi, beforeEach } from 'vitest';
const {
  createLineAiOrchestrator,
} = require('../../netlify/functions/lib/line-ai/orchestrator.cjs');

describe('LINE AI Orchestrator', () => {
  let config;
  let store;
  let keyPool;
  let gemini;
  let executeTools;
  let renderAiReply;
  let clock;
  let supabase;

  beforeEach(() => {
    config = {
      enabled: true,
      model: 'gemini-3.1-flash-lite',
      fallbackModels: ['gemini-2.5-flash-lite'],
      aiDailyLimit: 30,
      groundingDailyLimit: 5,
      rollingLimit: 5,
      rollingWindowSeconds: 600,
      timeoutMs: 8000,
      adminUserIds: new Set(['admin-1']),
      geminiApiKeys: new Map([[1, 'key-1']]),
      groundingEnabled: true,
    };

    store = {
      getPreference: vi.fn().mockResolvedValue(null),
      savePreference: vi.fn(async (_userId, preference) => preference),
      clearPreference: vi.fn(),
      getCache: vi.fn().mockResolvedValue(null),
      putCache: vi.fn(),
      getHistory: vi.fn().mockResolvedValue([]),
      appendMessage: vi.fn(),
      claimQuota: vi.fn().mockResolvedValue({ allowed: true, used: 1 }),
    };

    keyPool = {
      execute: vi.fn(async (op) => op({ apiKey: 'key-1', slot: 1 })),
    };

    gemini = {
      resolveModel: vi.fn().mockResolvedValue('gemini-3.1-flash-lite'),
      plan: vi.fn(),
      synthesize: vi.fn(),
    };

    executeTools = vi.fn().mockResolvedValue([]);
    renderAiReply = vi.fn((opts) => [{ type: 'text', text: opts.text }]);
    clock = { now: () => new Date('2026-06-20T10:00:00Z') };
    supabase = {};
  });

  it('returns cache hit without quota or Gemini call', async () => {
    store.getCache.mockResolvedValue({
      response: { messages: [{ type: 'text', text: 'cached' }] },
      source_type: 'general',
    });
    const orchestrator = createLineAiOrchestrator({
      supabase,
      config,
      store,
      keyPool,
      gemini,
      executeTools,
      renderAiReply,
      clock,
    });

    const result = await orchestrator.answer({ userId: 'U1', text: 'ข้าว' });
    expect(result).toMatchObject({ messages: [{ text: 'cached' }] });
    expect(store.claimQuota).not.toHaveBeenCalled();
    expect(keyPool.execute).not.toHaveBeenCalled();
  });

  it('uses planner answer directly for general question in one AI call', async () => {
    gemini.plan.mockResolvedValue({
      intent: 'general',
      answer: 'คำตอบสำหรับการพูดคุย',
      tools: [],
      needsGrounding: false,
    });
    const orchestrator = createLineAiOrchestrator({
      supabase,
      config,
      store,
      keyPool,
      gemini,
      executeTools,
      renderAiReply,
      clock,
    });

    const result = await orchestrator.answer({ userId: 'U1', text: 'สวัสดี' });
    expect(result.messages[0].text).toBe('คำตอบสำหรับการพูดคุย');
    expect(gemini.synthesize).not.toHaveBeenCalled();
    expect(store.claimQuota).not.toHaveBeenCalled();
    expect(store.putCache).toHaveBeenCalled();
  });

  it('does not cache when history is present', async () => {
    store.getHistory.mockResolvedValue([{ role: 'user', content: 'hello' }]);
    gemini.plan.mockResolvedValue({
      intent: 'general',
      answer: 'คำตอบสำหรับการพูดคุย',
      tools: [],
      needsGrounding: false,
    });
    const orchestrator = createLineAiOrchestrator({
      supabase,
      config,
      store,
      keyPool,
      gemini,
      executeTools,
      renderAiReply,
      clock,
    });

    await orchestrator.answer({ userId: 'U1', text: 'สวัสดี' });
    expect(store.putCache).not.toHaveBeenCalled();
  });

  it('uses planner then tools then synthesis for database question', async () => {
    gemini.plan.mockResolvedValue({
      intent: 'database',
      answer: '',
      tools: ['global_search'],
      searchTerms: ['ส้มโอ'],
      tables: ['large_plots'],
      needsGrounding: false,
    });
    gemini.synthesize.mockResolvedValue('พบข้อมูลเกษตรกรส้มโอ');
    const orchestrator = createLineAiOrchestrator({
      supabase,
      config,
      store,
      keyPool,
      gemini,
      executeTools,
      renderAiReply,
      clock,
    });

    await orchestrator.answer({ userId: 'U1', text: 'ส้มโออยู่ไหน' });
    expect(store.claimQuota).not.toHaveBeenCalled();
    expect(executeTools).toHaveBeenCalledWith(
      supabase,
      ['global_search'],
      ['ส้มโอ'],
      ['large_plots']
    );
    expect(gemini.synthesize).toHaveBeenCalled();
  });

  it('passes area summary context for farmer-group count questions', async () => {
    gemini.plan.mockResolvedValue({
      intent: 'database',
      answer: '',
      tools: ['area_summary'],
      searchTerms: [],
      tables: ['young_farmer_groups_detailed'],
      district: 'บางเลน',
      subdistrict: null,
      areaScope: 'district',
      farmerGroupType: 'young_farmer',
      preferenceAction: 'none',
      needsGrounding: false,
    });
    executeTools.mockResolvedValue([
      {
        tool: 'area_summary',
        data: {
          coverage: 'district',
          label: 'กลุ่มยุวเกษตรกร',
          district: 'บางเลน',
          total: 3,
          url: 'https://npt-dashboard.netlify.app/dashboard/development/young-farmer-groups',
        },
      },
    ]);
    gemini.synthesize.mockResolvedValue('อำเภอบางเลนมีกลุ่มยุวเกษตรกร 3 กลุ่ม');

    const orchestrator = createLineAiOrchestrator({
      supabase,
      config,
      store,
      keyPool,
      gemini,
      executeTools,
      renderAiReply,
      clock,
    });

    await orchestrator.answer({
      userId: 'U1',
      text: 'อำเภอบางเลนมีกลุ่มยุวเกษตรกี่กลุ่ม',
    });

    expect(executeTools).toHaveBeenCalledWith(
      supabase,
      ['area_summary'],
      [],
      ['young_farmer_groups_detailed'],
      {
        areaScope: 'district',
        district: 'บางเลน',
        subdistrict: null,
        farmerGroupType: 'young_farmer',
      }
    );
  });

  it('passes area search context for subdistrict farmer-group listing questions', async () => {
    gemini.plan.mockResolvedValue({
      intent: 'database',
      answer: '',
      tools: ['area_search'],
      searchTerms: [],
      tables: [],
      district: 'บางเลน',
      subdistrict: 'บางช้าง',
      areaScope: 'subdistrict',
      farmerGroupType: 'all',
      preferenceAction: 'none',
      needsGrounding: false,
    });
    executeTools.mockResolvedValue([
      {
        tool: 'area_search',
        data: {
          coverage: 'subdistrict',
          district: 'บางเลน',
          subdistrict: 'บางช้าง',
          total: 1,
          categories: [
            {
              table: 'young_farmer_groups_detailed',
              label: 'กลุ่มยุวเกษตรกร',
              totalCount: 1,
              url: 'https://npt-dashboard.netlify.app/dashboard/development/young-farmer-groups',
              results: [{ group_name: 'กลุ่มยุวเกษตรบางช้าง' }],
            },
          ],
        },
      },
    ]);
    gemini.synthesize.mockResolvedValue('ตำบลบางช้างพบกลุ่มเกษตรกร 1 รายการ');

    const orchestrator = createLineAiOrchestrator({
      supabase,
      config,
      store,
      keyPool,
      gemini,
      executeTools,
      renderAiReply,
      clock,
    });

    await orchestrator.answer({
      userId: 'U1',
      text: 'ตำบลบางช้างมีกลุ่มเกษตรกรอะไรบ้าง',
    });

    expect(executeTools).toHaveBeenCalledWith(
      supabase,
      ['area_search'],
      [],
      [],
      {
        areaScope: 'subdistrict',
        district: 'บางเลน',
        subdistrict: 'บางช้าง',
        farmerGroupType: 'all',
      }
    );
  });

  it('includes subdistrict fallback wording and district URL in rendered replies', async () => {
    gemini.plan.mockResolvedValue({
      intent: 'database',
      tools: ['area_summary'],
      tables: ['young_farmer_groups_detailed'],
      searchTerms: [],
      district: 'บางเลน',
      subdistrict: 'ไม่พบ',
      areaScope: 'subdistrict',
      farmerGroupType: 'young_farmer',
      preferenceAction: 'none',
      needsGrounding: false,
    });
    executeTools.mockResolvedValue([
      {
        tool: 'area_summary',
        data: {
          coverage: 'district_fallback',
          reason: 'ไม่พบข้อมูลระดับตำบล ไม่พบ',
          label: 'กลุ่มยุวเกษตรกร',
          district: 'บางเลน',
          requestedSubdistrict: 'ไม่พบ',
          total: 3,
          url: 'https://npt-dashboard.netlify.app/dashboard/development/young-farmer-groups',
        },
      },
    ]);
    gemini.synthesize.mockResolvedValue('อำเภอบางเลนมีกลุ่มยุวเกษตรกร 3 กลุ่ม');

    const orchestrator = createLineAiOrchestrator({
      supabase,
      config,
      store,
      keyPool,
      gemini,
      executeTools,
      renderAiReply,
      clock,
    });

    await orchestrator.answer({
      userId: 'U1',
      text: 'ตำบลไม่พบมีกลุ่มยุวเกษตรกี่กลุ่ม',
    });

    expect(renderAiReply).toHaveBeenCalledWith({
      text: expect.stringContaining('ข้อมูลระดับตำบลไม่พอ'),
      records: [
        expect.objectContaining({
          url: 'https://npt-dashboard.netlify.app/dashboard/development/young-farmer-groups',
          totalCount: 3,
        }),
      ],
    });
  });

  it('uses a latest-message crop override without saving it', async () => {
    store.getPreference.mockResolvedValue({
      crop: 'ข้าว',
      district: 'สามพราน',
    });
    gemini.plan.mockResolvedValue({
      intent: 'database',
      answer: '',
      tools: ['disease_forecast'],
      tables: [],
      searchTerms: [],
      crop: 'กล้วยไม้',
      district: null,
      preferenceAction: 'none',
      needsGrounding: false,
    });
    gemini.synthesize.mockResolvedValue('ความเสี่ยงกล้วยไม้');

    const orchestrator = createLineAiOrchestrator({
      supabase,
      config,
      store,
      keyPool,
      gemini,
      executeTools,
      renderAiReply,
      clock,
    });

    await orchestrator.answer({ userId: 'U1', text: 'แล้วกล้วยไม้ล่ะ' });

    expect(executeTools).toHaveBeenCalledWith(
      supabase,
      ['disease_forecast'],
      [],
      [],
      { crop: 'กล้วยไม้', district: 'สามพราน' }
    );
    expect(store.savePreference).not.toHaveBeenCalled();
  });

  it('saves an explicit preference update merged with saved values', async () => {
    store.getPreference.mockResolvedValue({
      crop: 'ข้าว',
      district: 'สามพราน',
    });
    gemini.plan.mockResolvedValue({
      intent: 'general',
      answer: 'จำกล้วยไม้ให้แล้วค่ะ',
      tools: [],
      tables: [],
      searchTerms: [],
      crop: 'กล้วยไม้',
      district: null,
      preferenceAction: 'save',
      needsGrounding: false,
    });

    const orchestrator = createLineAiOrchestrator({
      supabase,
      config,
      store,
      keyPool,
      gemini,
      executeTools,
      renderAiReply,
      clock,
    });

    await orchestrator.answer({
      userId: 'U1',
      text: 'เปลี่ยนเป็นกล้วยไม้ จำไว้',
    });

    expect(store.savePreference).toHaveBeenCalledWith('U1', {
      crop: 'กล้วยไม้',
      district: 'สามพราน',
    });
  });

  it('clears preferences only for an explicit clear action', async () => {
    store.getPreference.mockResolvedValue({
      crop: 'ข้าว',
      district: 'สามพราน',
    });
    gemini.plan.mockResolvedValue({
      intent: 'general',
      answer: 'ลืมข้อมูลให้แล้วค่ะ',
      tools: [],
      tables: [],
      searchTerms: [],
      crop: null,
      district: null,
      preferenceAction: 'clear',
      needsGrounding: false,
    });

    const orchestrator = createLineAiOrchestrator({
      supabase,
      config,
      store,
      keyPool,
      gemini,
      executeTools,
      renderAiReply,
      clock,
    });

    await orchestrator.answer({ userId: 'U1', text: 'ลืมข้อมูลของฉัน' });

    expect(store.clearPreference).toHaveBeenCalledWith('U1');
    expect(store.savePreference).not.toHaveBeenCalled();
  });

  it('asks for a crop before running disease forecast', async () => {
    store.getPreference.mockResolvedValue({
      crop: null,
      district: 'สามพราน',
    });
    gemini.plan.mockResolvedValue({
      intent: 'database',
      answer: '',
      tools: ['disease_forecast'],
      tables: [],
      searchTerms: [],
      crop: null,
      district: null,
      preferenceAction: 'none',
      needsGrounding: false,
    });

    const orchestrator = createLineAiOrchestrator({
      supabase,
      config,
      store,
      keyPool,
      gemini,
      executeTools,
      renderAiReply,
      clock,
    });

    const result = await orchestrator.answer({
      userId: 'U1',
      text: 'ช่วงนี้ต้องระวังอะไร',
    });

    expect(result.messages[0].text).toContain('ระบุพืช');
    expect(executeTools).not.toHaveBeenCalled();
    expect(gemini.synthesize).not.toHaveBeenCalled();
  });
  it('renders three disease risks as three dashboard records', async () => {
    store.getPreference.mockResolvedValue({
      crop: 'ข้าว',
      district: 'สามพราน',
    });
    gemini.plan.mockResolvedValue({
      intent: 'database',
      tools: ['disease_forecast'],
      tables: [],
      searchTerms: [],
      crop: null,
      district: null,
      preferenceAction: 'none',
      needsGrounding: false,
    });
    executeTools.mockResolvedValue([
      {
        tool: 'disease_forecast',
        data: {
          scope: 'province',
          risks: [
            { name: 'โรคไหม้ข้าว', target_crop: 'ข้าว', risk_level: 'สูง' },
            {
              name: 'เพลี้ยกระโดด',
              target_crop: 'ข้าว',
              risk_level: 'ปานกลาง',
            },
            { name: 'หนอนกอ', target_crop: 'ข้าว', risk_level: 'ต่ำ' },
          ],
        },
      },
    ]);
    gemini.synthesize.mockResolvedValue('พบ 3 ความเสี่ยง');

    const orchestrator = createLineAiOrchestrator({
      supabase,
      config,
      store,
      keyPool,
      gemini,
      executeTools,
      renderAiReply,
      clock,
    });

    await orchestrator.answer({ userId: 'U1', text: 'ต้องระวังอะไร' });

    expect(gemini.synthesize).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        preferences: { crop: 'ข้าว', district: 'สามพราน' },
      })
    );
    expect(renderAiReply).toHaveBeenCalledWith({
      text: expect.stringContaining('พบ 3 ความเสี่ยง'),
      records: [
        expect.objectContaining({ title: 'โรคไหม้ข้าว', totalCount: 3 }),
        expect.objectContaining({ title: 'เพลี้ยกระโดด', totalCount: 3 }),
        expect.objectContaining({ title: 'หนอนกอ', totalCount: 3 }),
      ],
    });
  });

  it('keeps one disease risk text-only', async () => {
    store.getPreference.mockResolvedValue({
      crop: 'ข้าว',
      district: 'สามพราน',
    });
    gemini.plan.mockResolvedValue({
      intent: 'database',
      tools: ['disease_forecast'],
      tables: [],
      searchTerms: [],
      crop: null,
      district: null,
      preferenceAction: 'none',
      needsGrounding: false,
    });
    executeTools.mockResolvedValue([
      {
        tool: 'disease_forecast',
        data: {
          scope: 'province',
          risks: [
            { name: 'โรคไหม้ข้าว', target_crop: 'ข้าว', risk_level: 'สูง' },
          ],
        },
      },
    ]);
    gemini.synthesize.mockResolvedValue('พบความเสี่ยงเดียว');

    const orchestrator = createLineAiOrchestrator({
      supabase,
      config,
      store,
      keyPool,
      gemini,
      executeTools,
      renderAiReply,
      clock,
    });

    await orchestrator.answer({ userId: 'U1', text: 'ต้องระวังอะไร' });

    expect(renderAiReply).toHaveBeenCalledWith({
      text: 'พบความเสี่ยงเดียว',
      records: [],
    });
  });
  it('uses grounding without application quota', async () => {
    gemini.plan.mockResolvedValue({
      intent: 'news',
      answer: '',
      tools: [],
      needsGrounding: true,
    });
    const orchestrator = createLineAiOrchestrator({
      supabase,
      config,
      store,
      keyPool,
      gemini,
      executeTools,
      renderAiReply,
      clock,
    });

    await orchestrator.answer({ userId: 'U1', text: 'ข่าววันนี้' });
    expect(gemini.synthesize).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ grounding: true })
    );
    expect(store.claimQuota).not.toHaveBeenCalled();
  });
  it('falls back when every key fails', async () => {
    keyPool.execute.mockRejectedValue(
      Object.assign(new Error('none'), { code: 'NO_HEALTHY_KEY' })
    );
    const orchestrator = createLineAiOrchestrator({
      supabase,
      config,
      store,
      keyPool,
      gemini,
      executeTools,
      renderAiReply,
      clock,
    });

    const result = await orchestrator.answer({ userId: 'U1', text: 'ถาม AI' });
    expect(result).toBeNull();
  });

  it('falls back when timeout is exceeded', async () => {
    vi.useFakeTimers();
    keyPool.execute.mockImplementation(() => {
      return new Promise((resolve) => setTimeout(resolve, 30000));
    });

    const orchestrator = createLineAiOrchestrator({
      supabase,
      config,
      store,
      keyPool,
      gemini,
      executeTools,
      renderAiReply,
      clock,
    });

    const answerPromise = orchestrator.answer({ userId: 'U1', text: 'ส้มโอ' });
    vi.advanceTimersByTime(21000);
    const result = await answerPromise;
    expect(result).toBeNull();
    vi.useRealTimers();
  });
});
