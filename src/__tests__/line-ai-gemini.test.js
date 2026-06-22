import { describe, expect, it, vi, beforeEach } from 'vitest';
const {
  createGeminiClient,
} = require('../../netlify/functions/lib/line-ai/gemini.cjs');

describe('Gemini LINE client', () => {
  beforeEach(() => {
    // Clear modules or cache if needed, but since modelCache is global in module, we can use different api keys.
  });

  it('falls back to accessible configured model', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        models: [
          {
            name: 'models/gemini-2.5-flash-lite',
            supportedGenerationMethods: ['generateContent'],
          },
        ],
      }),
    });
    const client = createGeminiClient({
      fetch: fetchMock,
      model: 'gemini-3.1-flash-lite',
      fallbacks: ['gemini-2.5-flash-lite'],
      timeoutMs: 8000,
    });
    await expect(client.resolveModel('key-1')).resolves.toBe(
      'gemini-2.5-flash-lite'
    );
    // Cache check
    await client.resolveModel('key-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('enables google_search only for current intent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'สด' }] } }],
      }),
    });
    const client = createGeminiClient({
      fetch: fetchMock,
      model: 'gemini-2.5-flash-lite',
      fallbacks: [],
      timeoutMs: 8000,
    });
    await client.synthesize('key-2', 'gemini-2.5-flash-lite', {
      question: 'ราคาวันนี้',
      history: [],
      evidence: [],
      grounding: true,
    });
    expect(fetchMock).toHaveBeenCalled();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.tools).toEqual([{ google_search: {} }]);
  });

  it('plans correctly and sanitizes invalid values', async () => {
    const planResponse = {
      intent: 'invalid-intent-here',
      tools: ['global_search', 'raw_sql'],
      tables: ['large_plots', 'personnel', 'audit_logs'],
      searchTerms: ['term1', 'term2', 'term3', 'term4', 'term5', 'term6'],
      needsGrounding: true, // Should be forced to false because intent is not 'current'
      answer: 'General reply',
    };
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        candidates: [
          { content: { parts: [{ text: JSON.stringify(planResponse) }] } },
        ],
      }),
    });
    const client = createGeminiClient({
      fetch: fetchMock,
      model: 'gemini-2.5-flash-lite',
      timeoutMs: 8000,
    });
    const result = await client.plan('key-3', 'gemini-2.5-flash-lite', {
      question: 'Hello',
      history: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
      ],
    });

    expect(result.intent).toBe('general');
    expect(result.tools).toEqual(['global_search']);
    expect(result.tables).toEqual(['large_plots', 'personnel']);
    expect(result.searchTerms).toHaveLength(5);
    expect(result.needsGrounding).toBe(false);
  });

  it('throws non-2xx responses carrying status and retryAfterMs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 429,
      headers: {
        get: (name) => (name === 'retry-after' ? '60' : null),
      },
    });
    const client = createGeminiClient({
      fetch: fetchMock,
      model: 'gemini-2.5-flash-lite',
      timeoutMs: 8000,
    });

    await expect(
      client.synthesize('key-4', 'gemini-2.5-flash-lite', { question: 'x' })
    ).rejects.toMatchObject({
      status: 429,
      retryAfterMs: 60000,
    });
  });
});
