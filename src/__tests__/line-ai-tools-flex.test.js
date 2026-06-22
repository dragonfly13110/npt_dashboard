import { describe, expect, it, vi } from 'vitest';
const {
  executeTools,
} = require('../../netlify/functions/lib/line-ai/tools.cjs');
const {
  renderAiReply,
  validateLineMessages,
} = require('../../netlify/functions/lib/line-ai/flex.cjs');

describe('LINE AI tools and rendering', () => {
  it('rejects unknown tools before DB access', async () => {
    const supabase = { rpc: vi.fn(), from: vi.fn() };
    await expect(executeTools(supabase, ['raw_sql'], ['x'])).rejects.toThrow(
      'Tool not allowed'
    );
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('does not query internal tables even if passed directly', async () => {
    const supabase = { rpc: vi.fn(), from: vi.fn() };

    await expect(
      executeTools(supabase, ['global_search'], ['ข้อมูล'], ['audit_logs'])
    ).resolves.toEqual([{ tool: 'global_search', data: [] }]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
  it('runs allowlisted tools successfully', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: [
        {
          table: 'large_plots',
          totalCount: 1,
          results: [{ id: '1', plot_name: 'สวนส้มโอสมชาย' }],
        },
      ],
      error: null,
    });
    const mockLimit = vi
      .fn()
      .mockReturnValue({ data: ['weather'], error: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ order: mockOrder }),
    });

    const supabase = {
      rpc: mockRpc,
      from: mockFrom,
    };

    const results = await executeTools(
      supabase,
      ['global_search', 'latest_weather'],
      ['ส้มโอ', 'สามพราน'],
      ['large_plots']
    );
    expect(results).toHaveLength(2);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('global_search_public', {
      search_terms: ['ส้มโอ', 'สามพราน'],
      table_names: ['large_plots'],
      result_limit: 3,
    });
    expect(mockFrom).toHaveBeenCalledWith('daily_weather');
  });

  it('filters the latest disease forecast by effective crop', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        forecast_date: '2026-06-23',
        summary: 'จังหวัดมีฝนต่อเนื่อง',
        details: [
          {
            name: 'โรคไหม้ข้าว',
            type: 'โรคพืช',
            target_crop: 'ข้าว',
            risk_level: 'สูง',
            description: 'ความชื้นสูง',
            prevention: 'ตรวจแปลง',
          },
          {
            name: 'โรคเน่าดำกล้วยไม้',
            type: 'โรคพืช',
            target_crop: 'กล้วยไม้',
            risk_level: 'สูง',
          },
        ],
      },
      error: null,
    });
    const limit = vi.fn().mockReturnValue({ maybeSingle });
    const order = vi.fn().mockReturnValue({ limit });
    const select = vi.fn().mockReturnValue({ order });
    const supabase = { from: vi.fn().mockReturnValue({ select }) };

    const result = await executeTools(supabase, ['disease_forecast'], [], [], {
      crop: 'ข้าว',
      district: 'สามพราน',
    });

    expect(supabase.from).toHaveBeenCalledWith('ai_disease_forecasts');
    expect(select).toHaveBeenCalledWith('forecast_date,summary,details');
    expect(order).toHaveBeenCalledWith('forecast_date', { ascending: false });
    expect(result[0].data).toMatchObject({
      forecastDate: '2026-06-23',
      district: 'สามพราน',
      scope: 'province',
      risks: [
        expect.objectContaining({
          name: 'โรคไหม้ข้าว',
          target_crop: 'ข้าว',
          risk_level: 'สูง',
        }),
      ],
    });
    expect(result[0].data.risks).toHaveLength(1);
  });
  it('uses contents, never bubbles, for Flex carousel', () => {
    const messages = renderAiReply({
      text: 'พบข้อมูล',
      records: [
        {
          title: 'ส้มโอ',
          subtitle: 'สามพราน',
          url: 'https://npt-dashboard.netlify.app/dashboard',
        },
      ],
    });
    const message = messages.find((m) => m.type === 'flex');
    expect(message).toBeDefined();
    expect(message.contents).toEqual(
      expect.objectContaining({ type: 'carousel', contents: expect.any(Array) })
    );
    expect(message.contents).not.toHaveProperty('bubbles');
  });

  it('caps Flex preview at 3 cards and shows total count', () => {
    const messages = renderAiReply({
      text: 'พบแปลงใหญ่ 50 แห่ง',
      records: Array.from({ length: 5 }, (_, index) => ({
        title: 'แปลง ' + (index + 1),
        subtitle: 'นครปฐม',
        totalCount: 50,
        url: 'https://npt-dashboard.netlify.app/dashboard/production/large-plots',
      })),
    });

    const bubbles = messages.find((message) => message.type === 'flex').contents
      .contents;
    expect(bubbles).toHaveLength(3);
    expect(bubbles[0].footer.contents[0].action.label).toBe(
      'ดูทั้งหมด 50 รายการ'
    );
  });
  it('returns text reply when no records are provided', () => {
    const result = renderAiReply({ text: 'ไม่พบข้อมูล' });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: 'text',
      text: 'ไม่พบข้อมูล',
    });
  });

  it('validates correct LINE messages', () => {
    const valid = [
      { type: 'text', text: 'สวัสดี' },
      {
        type: 'flex',
        altText: 'พบข้อมูล',
        contents: {
          type: 'carousel',
          contents: [],
        },
      },
    ];
    expect(() => validateLineMessages(valid)).not.toThrow();
  });

  it('throws validation error on invalid message structures', () => {
    expect(() => validateLineMessages([])).toThrow(
      'LINE messages count must be between 1'
    );
    expect(() => validateLineMessages([{ type: 'invalid' }])).toThrow(
      'Unsupported message type'
    );
    expect(() =>
      validateLineMessages([{ type: 'flex', altText: 'x' }])
    ).toThrow('Flex message requires contents object');
    expect(() =>
      validateLineMessages([
        {
          type: 'flex',
          altText: 'x',
          contents: { type: 'carousel', bubbles: [] },
        },
      ])
    ).toThrow('Flex contents must not have a bubbles property');
    expect(() =>
      validateLineMessages([
        { type: 'flex', altText: 'x', contents: { type: 'carousel' } },
      ])
    ).toThrow('Carousel Flex message must have a contents array');
    expect(() =>
      validateLineMessages([
        { type: 'flex', bubbles: {}, altText: 'x', contents: {} },
      ])
    ).toThrow('Flex message must not have bubbles property on the top level');
  });
});
