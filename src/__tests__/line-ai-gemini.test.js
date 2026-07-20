import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createGeminiClient } from '../../netlify/functions/lib/line-ai/gemini.js';

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

  it('returns only grounded external answers with cited sources', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: { parts: [{ text: 'ข้อมูลจากเว็บ' }] },
            groundingMetadata: {
              groundingChunks: [
                {
                  web: {
                    title: 'แหล่งข้อมูล',
                    uri: 'https://example.com/source',
                  },
                },
              ],
            },
          },
        ],
      }),
    });
    const client = createGeminiClient({
      fetch: fetchMock,
      model: 'gemini-2.5-flash-lite',
    });
    await expect(
      client.searchExternal('key-web', 'gemini-2.5-flash-lite', {
        question: 'ราคาสินค้าวันนี้',
      })
    ).resolves.toEqual({
      text: 'ข้อมูลจากเว็บ',
      sources: [{ title: 'แหล่งข้อมูล', url: 'https://example.com/source' }],
    });
  });

  it('keeps district context province-honest during synthesis', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'คำตอบ' }] } }],
      }),
    });
    const client = createGeminiClient({
      fetch: fetchMock,
      model: 'gemini-2.5-flash-lite',
      timeoutMs: 8000,
    });

    await client.synthesize('key-scope', 'gemini-2.5-flash-lite', {
      question: 'ต้องระวังอะไร',
      evidence: [{ tool: 'disease_forecast', scope: 'province' }],
      preferences: { crop: 'ข้าว', district: 'สามพราน' },
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const instruction = body.systemInstruction.parts[0].text;
    const prompt = body.contents.at(-1).parts[0].text;
    expect(instruction).toContain('province-level');
    expect(instruction).toContain('Never claim');
    expect(instruction).toContain('2-5 lines');
    expect(instruction).toContain('Do not add unsolicited empathy');
    expect(prompt).toContain('สามพราน');
  });

  it('instructs planner to route every portal-data question through tools', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    intent: 'database',
                    tools: ['global_search'],
                    tables: ['large_plots'],
                    searchTerms: [],
                    crop: '',
                    district: '',
                    preferenceAction: 'none',
                    needsGrounding: false,
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    const client = createGeminiClient({
      fetch: fetchMock,
      model: 'gemini-2.5-flash-lite',
      timeoutMs: 8000,
    });

    await client.plan('key-routing', 'gemini-2.5-flash-lite', {
      question: 'พุทธมณฑลมีแปลงใหญ่อะไรบ้าง',
    });

    const instruction = JSON.parse(fetchMock.mock.calls[0][1].body)
      .systemInstruction.parts[0].text;
    expect(instruction).toContain('Every portal-data question');
    expect(instruction).toContain('must use an allowlisted tool');
    expect(instruction).toContain('personnel_summary');
    expect(instruction).toContain('district_breakdown');
    expect(instruction).toContain('ONLY when the user asks for a number');
    expect(instruction).toContain('MUST use global_search');
    expect(instruction).toContain('specific personnel job titles');
  });

  it('instructs planner to route area counts and subdistrict lookups through area tools', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    intent: 'database',
                    tools: ['area_summary'],
                    tables: ['young_farmer_groups_detailed'],
                    searchTerms: [],
                    crop: '',
                    district: 'บางเลน',
                    subdistrict: 'บางช้าง',
                    areaScope: 'subdistrict',
                    farmerGroupType: 'young_farmer',
                    personnelScope: 'none',
                    preferenceAction: 'none',
                    needsGrounding: false,
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    const client = createGeminiClient({
      fetch: fetchMock,
      model: 'gemini-2.5-flash-lite',
      timeoutMs: 8000,
    });

    const result = await client.plan('key-area', 'gemini-2.5-flash-lite', {
      question: 'ตำบลบางช้างมีกลุ่มยุวเกษตรกี่กลุ่ม',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const instruction = body.systemInstruction.parts[0].text;
    const schema = body.generationConfig.responseSchema;
    expect(instruction).toContain('area_summary');
    expect(instruction).toContain('area_search');
    expect(instruction).toContain('subdistrict');
    expect(instruction).toContain('fallback to district');
    expect(schema.properties).toHaveProperty('subdistrict');
    expect(schema.properties).toHaveProperty('areaScope');
    expect(schema.properties.tools.items.enum).toContain('area_summary');
    expect(schema.properties.tools.items.enum).toContain('area_search');
    expect(result).toMatchObject({
      tools: ['area_summary'],
      areaScope: 'subdistrict',
      farmerGroupType: 'young_farmer',
      subdistrict: 'บางช้าง',
    });
  });

  it('plans correctly and sanitizes invalid values', async () => {
    const planResponse = {
      intent: 'invalid-intent-here',
      tools: ['global_search', 'area_search', 'raw_sql'],
      tables: ['large_plots', 'personnel', 'audit_logs'],
      crop: ' ข้าว ',
      district: 'กรุงเทพ',
      subdistrict: ' บางช้าง ',
      areaScope: 'subdistrict_breakdown',
      farmerGroupType: 'nonsense',
      preferenceAction: 'overwrite_everything',
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
    expect(result.tools).toEqual(['global_search', 'area_search']);
    expect(result.tables).toEqual(['large_plots', 'personnel']);
    expect(result.crop).toBe('ข้าว');
    expect(result.district).toBeNull();
    expect(result.subdistrict).toBe('บางช้าง');
    expect(result.areaScope).toBe('subdistrict_breakdown');
    expect(result.farmerGroupType).toBe('all');
    expect(result.preferenceAction).toBe('none');
    expect(result.searchTerms).toHaveLength(5);
    expect(result.needsGrounding).toBe(false);
  });

  it('allows the disease forecast tool', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    intent: 'database',
                    tools: ['disease_forecast'],
                    tables: [],
                    searchTerms: [],
                    crop: 'ข้าว',
                    district: 'สามพราน',
                    preferenceAction: 'none',
                    needsGrounding: false,
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    const client = createGeminiClient({
      fetch: fetchMock,
      model: 'gemini-2.5-flash-lite',
      timeoutMs: 8000,
    });

    const result = await client.plan('key-disease', 'gemini-2.5-flash-lite', {
      question: 'ข้าวเสี่ยงโรคอะไร',
      preferences: { crop: 'ข้าว', district: 'สามพราน' },
    });

    expect(result.tools).toEqual(['disease_forecast']);
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

  it('instructs planner to clarify system menus and not confuse with food menus', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    intent: 'general',
                    tools: [],
                    tables: [],
                    searchTerms: [],
                    crop: 'none',
                    district: 'none',
                    preferenceAction: 'none',
                    needsGrounding: false,
                    answer: 'ระบบมีเมนูเด่นดังนี้...',
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    const client = createGeminiClient({
      fetch: fetchMock,
      model: 'gemini-2.5-flash-lite',
      timeoutMs: 8000,
    });

    await client.plan('key-menu', 'gemini-2.5-flash-lite', {
      question: 'มีเมนูอะไรบ้าง',
    });

    const instruction = JSON.parse(fetchMock.mock.calls[0][1].body)
      .systemInstruction.parts[0].text;
    expect(instruction).toContain('NOT a food menu');
    expect(instruction).toContain('เมนู');
    expect(instruction).toContain('ฟังก์ชัน');
  });

  it('instructs synthesizer to not confuse system menus with food menus', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'เมนูระบบ...' }] } }],
      }),
    });
    const client = createGeminiClient({
      fetch: fetchMock,
      model: 'gemini-2.5-flash-lite',
      timeoutMs: 8000,
    });

    await client.synthesize('key-synth-menu', 'gemini-2.5-flash-lite', {
      question: 'เมนูหลักของระบบ',
      evidence: [],
    });

    const instruction = JSON.parse(fetchMock.mock.calls[0][1].body)
      .systemInstruction.parts[0].text;
    expect(instruction).toContain('Never confuse system/UI menus');
    expect(instruction).toContain('food or restaurant menus');
  });
});
