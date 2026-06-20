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
    };

    store = {
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
    expect(store.claimQuota).toHaveBeenCalledTimes(1); // 1 for plan
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
    expect(store.claimQuota).toHaveBeenCalledTimes(2); // 1 plan, 1 synthesis
    expect(executeTools).toHaveBeenCalledWith(
      supabase,
      ['global_search'],
      ['ส้มโอ']
    );
    expect(gemini.synthesize).toHaveBeenCalled();
  });

  it('claims grounding quota only for current intent', async () => {
    gemini.plan.mockResolvedValue({
      intent: 'current',
      answer: '',
      tools: [],
      searchTerms: [],
      needsGrounding: true,
    });
    gemini.synthesize.mockResolvedValue('ข่าวสภาพอากาศวันนี้');
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
    expect(store.claimQuota).toHaveBeenCalledWith(
      'U1',
      'grounding',
      expect.any(Object)
    );
  });

  it('returns deterministic limit message when daily quota denied', async () => {
    store.claimQuota.mockResolvedValue({ allowed: false, reason: 'daily' });
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
    expect(result.messages[0].text).toContain('โควต้า AI วันนี้หมด');
    expect(keyPool.execute).not.toHaveBeenCalled();
  });

  it('bypasses quota for admin users', async () => {
    gemini.plan.mockResolvedValue({
      intent: 'general',
      answer: 'admin reply',
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

    await orchestrator.answer({ userId: 'admin-1', text: 'สวัสดี' });
    expect(store.claimQuota).not.toHaveBeenCalled();
  });

  it('returns deterministic summary when second AI quota is denied', async () => {
    gemini.plan.mockResolvedValue({
      intent: 'database',
      answer: '',
      tools: ['global_search'],
      searchTerms: ['ส้มโอ'],
      needsGrounding: false,
    });
    store.claimQuota
      .mockResolvedValueOnce({ allowed: true }) // First quota (plan) allowed
      .mockResolvedValueOnce({ allowed: false }); // Second quota (synthesis) denied

    executeTools.mockResolvedValue([
      {
        tool: 'global_search',
        data: [
          {
            table: 'large_plots',
            results: [
              { plot_name: 'สวนส้มโอสมชาย', district: 'สามพราน', area_rai: 10 },
            ],
          },
        ],
      },
    ]);

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

    await orchestrator.answer({ userId: 'U1', text: 'สวนส้มโออยู่ไหน' });
    // Expect renderAiReply to be called with the deterministic summary records
    expect(renderAiReply).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('โควต้า AI สำหรับสรุปผลในวันนี้หมดแล้ว'),
        records: expect.arrayContaining([
          expect.objectContaining({ title: 'สวนส้มโอสมชาย' }),
        ]),
      })
    );
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
