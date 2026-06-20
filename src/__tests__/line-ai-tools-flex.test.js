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
      ['ส้มโอ']
    );
    expect(results).toHaveLength(2);
    expect(mockRpc).toHaveBeenCalledWith('global_search', {
      search_term: 'ส้มโอ',
      result_limit: 10,
    });
    expect(mockFrom).toHaveBeenCalledWith('daily_weather');
  });

  it('uses contents, never bubbles, for Flex carousel', () => {
    const [message] = renderAiReply({
      text: 'พบข้อมูล',
      records: [
        {
          title: 'ส้มโอ',
          subtitle: 'สามพราน',
          url: 'https://npt-dashboard.netlify.app/dashboard',
        },
      ],
    });
    expect(message.contents).toEqual(
      expect.objectContaining({ type: 'carousel', contents: expect.any(Array) })
    );
    expect(message.contents).not.toHaveProperty('bubbles');
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
