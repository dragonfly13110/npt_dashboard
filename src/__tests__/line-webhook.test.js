import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// Set up mock env variables before requiring the module
process.env.VITE_SUPABASE_URL = 'https://mock-supabase-url.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
process.env.LINE_CHANNEL_SECRET = 'mock-secret';
process.env.LINE_CHANNEL_ACCESS_TOKEN = 'mock-token';

// Create mock supabase client instance
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      order: vi.fn(() => ({
        limit: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({ data: [], error: null })),
          })),
          data: [],
          error: null,
        })),
      })),
      or: vi.fn(() => ({
        limit: vi.fn(() => ({ data: [], error: null })),
      })),
      eq: vi.fn(() => ({
        limit: vi.fn(() => ({ data: [], error: null })),
      })),
    })),
  })),
  rpc: vi.fn(),
};

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Require CommonJS webhook file
const webhook = require('../../netlify/functions/line-webhook.cjs');
webhook.setSupabase(mockSupabase);

describe('line-webhook.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof webhook.setLineAiOrchestrator === 'function') {
      webhook.setLineAiOrchestrator(null);
    }
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => 'OK',
    });
    // Set up standard mock returns
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          limit: vi.fn(() => ({ data: [], error: null })),
        })),
      })),
    });
    mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
  });

  it('successfully verifies a valid signature', async () => {
    const body = JSON.stringify({ events: [] });
    const signature = crypto
      .createHmac('sha256', 'mock-secret')
      .update(body)
      .digest('base64');

    const event = {
      httpMethod: 'POST',
      headers: { 'x-line-signature': signature },
      body: body,
    };

    const response = await webhook.handler(event);
    expect(response.statusCode).toBe(200);
  });

  it('rejects an invalid signature with 401', async () => {
    const event = {
      httpMethod: 'POST',
      headers: { 'x-line-signature': 'invalid-signature' },
      body: JSON.stringify({ events: [] }),
    };

    const response = await webhook.handler(event);
    expect(response.statusCode).toBe(401);
  });

  it('routes text messages through the global search fallback when no prefixes match', async () => {
    // Mock database response for personnel search
    const mockPersonnelData = [
      {
        id: 1,
        full_name: 'สมชาย ดีใจ',
        position: 'นักวิชาการเกษตร',
        department: 'ฝ่ายส่งเสริม',
        phone: '0812345678',
      },
    ];
    // Mock database response for RPC global_search
    const mockGlobalSearchData = [
      {
        table: 'large_plots',
        totalCount: 5,
        results: [
          {
            id: 10,
            plot_name: 'แปลงใหญ่กล้วยไม้สามพราน',
            district: 'สามพราน',
            member_count: 20,
            area_rai: 150,
          },
        ],
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          limit: vi.fn(() => ({ data: mockPersonnelData, error: null })),
        })),
      })),
    });
    mockSupabase.rpc.mockResolvedValue({
      data: mockGlobalSearchData,
      error: null,
    });

    const event = {
      httpMethod: 'POST',
      headers: {}, // Skip verification signature by running without secret checking if needed,
      // but signature check is active. Let's generate a valid signature:
      body: JSON.stringify({
        events: [
          {
            type: 'message',
            replyToken: 'mockReplyToken',
            message: {
              type: 'text',
              text: 'กล้วยไม้',
            },
          },
        ],
      }),
    };

    // Make signature check pass
    const signature = crypto
      .createHmac('sha256', 'mock-secret')
      .update(event.body)
      .digest('base64');
    event.headers['x-line-signature'] = signature;

    const response = await webhook.handler(event);
    expect(response.statusCode).toBe(200);

    // Verify calls to Supabase
    expect(mockSupabase.from).toHaveBeenCalledWith('personnel');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('global_search', {
      search_term: 'กล้วยไม้',
      result_limit: 3,
    });

    // Verify reply fetch is called with Flex Message containing both personnel & large_plots
    expect(mockFetch).toHaveBeenCalled();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.line.me/v2/bot/message/reply');

    const payload = JSON.parse(options.body);
    expect(payload.replyToken).toBe('mockReplyToken');
    expect(payload.messages[0].type).toBe('flex');
    expect(payload.messages[0].altText).toContain(
      'ผลการค้นหาข้อมูลสำหรับ "กล้วยไม้"'
    );

    const carousel = payload.messages[0].contents;
    expect(carousel.type).toBe('carousel');
    expect(carousel.contents).toHaveLength(2); // One for personnel, one for large_plots

    // Bubble 1: Personnel
    expect(carousel.contents[0].header.contents[0].text).toContain(
      'บุคลากรเกษตร'
    );
    expect(carousel.contents[0].body.contents[0].contents[0].text).toBe(
      'สมชาย ดีใจ'
    );

    // Bubble 2: Large Plots
    expect(carousel.contents[1].header.contents[0].text).toContain('แปลงใหญ่');
    expect(carousel.contents[1].body.contents[0].contents[0].text).toBe(
      'แปลงใหญ่กล้วยไม้สามพราน'
    );
  });

  it('replies with not found message when no results match', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          limit: vi.fn(() => ({ data: [], error: null })),
        })),
      })),
    });
    mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

    const event = {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        events: [
          {
            type: 'message',
            replyToken: 'mockReplyToken',
            message: {
              type: 'text',
              text: 'คำที่ไม่น่าจะมีข้อมูล',
            },
          },
        ],
      }),
    };

    const signature = crypto
      .createHmac('sha256', 'mock-secret')
      .update(event.body)
      .digest('base64');
    event.headers['x-line-signature'] = signature;

    const response = await webhook.handler(event);
    expect(response.statusCode).toBe(200);

    expect(mockFetch).toHaveBeenCalled();
    const [, options] = mockFetch.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload.messages[0].text).toContain(
      'ไม่พบข้อมูลที่เกี่ยวข้องกับ "คำที่ไม่น่าจะมีข้อมูล"'
    );
  });

  it('sends exactly one AI reply for free text', async () => {
    webhook.setLineAiOrchestrator({
      answer: vi.fn().mockResolvedValue({
        messages: [{ type: 'text', text: 'คำตอบ AI' }],
        sourceType: 'general',
      }),
    });

    const event = {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        events: [
          {
            type: 'message',
            replyToken: 'mockReplyToken',
            message: {
              type: 'text',
              text: 'ถามอะไรก็ได้',
            },
          },
        ],
      }),
    };

    const signature = crypto
      .createHmac('sha256', 'mock-secret')
      .update(event.body)
      .digest('base64');
    event.headers['x-line-signature'] = signature;

    await webhook.handler(event);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body).messages[0].text).toBe('คำตอบ AI');
  });

  it('falls through to existing DB search when AI returns null', async () => {
    webhook.setLineAiOrchestrator({
      answer: vi.fn().mockResolvedValue(null),
    });

    const event = {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        events: [
          {
            type: 'message',
            replyToken: 'mockReplyToken',
            message: {
              type: 'text',
              text: 'ส้มโอ',
            },
          },
        ],
      }),
    };

    const signature = crypto
      .createHmac('sha256', 'mock-secret')
      .update(event.body)
      .digest('base64');
    event.headers['x-line-signature'] = signature;

    await webhook.handler(event);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('global_search', {
      search_term: 'ส้มโอ',
      result_limit: 3,
    });
  });

  it('never logs raw body, signature, user ID, or message text', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    webhook.setLineAiOrchestrator({
      answer: vi.fn().mockResolvedValue(null),
    });

    const event = {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        events: [
          {
            type: 'message',
            replyToken: 'mockReplyToken',
            source: { userId: 'U-test-123' },
            message: {
              type: 'text',
              text: 'ข้อความลับสุดยอด',
            },
          },
        ],
      }),
    };

    const signature = crypto
      .createHmac('sha256', 'mock-secret')
      .update(event.body)
      .digest('base64');
    event.headers['x-line-signature'] = signature;

    await webhook.handler(event);
    const combinedLogs = log.mock.calls.flat().join(' ');
    expect(combinedLogs).not.toMatch(
      /ข้อความลับสุดยอด|x-line-signature|rawBody|U-test-123/
    );
    log.mockRestore();
  });

  it('routes conversational text through AI before local keywords', async () => {
    const answer = vi.fn().mockResolvedValue({
      messages: [{ type: 'text', text: 'AI reply' }],
      sourceType: 'general',
    });
    webhook.setLineAiOrchestrator({ answer });

    const event = {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        events: [
          {
            type: 'message',
            replyToken: 'mockReplyToken',
            message: {
              type: 'text',
              text: 'สวัสดีครับน้องข้าวหลาม',
            },
          },
        ],
      }),
    };

    const signature = crypto
      .createHmac('sha256', 'mock-secret')
      .update(event.body)
      .digest('base64');
    event.headers['x-line-signature'] = signature;

    const response = await webhook.handler(event);
    expect(response.statusCode).toBe(200);
    expect(answer).toHaveBeenCalledTimes(1);

    expect(mockFetch).toHaveBeenCalled();
    const [, options] = mockFetch.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload.messages[0].text).toBe('AI reply');
  });

  it('handles local venting keywords with a detailed response', async () => {
    const event = {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        events: [
          {
            type: 'message',
            replyToken: 'mockReplyToken',
            message: {
              type: 'text',
              text: 'วันนี้เหนื่อยและร้อนมากเลย',
            },
          },
        ],
      }),
    };

    const signature = crypto
      .createHmac('sha256', 'mock-secret')
      .update(event.body)
      .digest('base64');
    event.headers['x-line-signature'] = signature;

    const response = await webhook.handler(event);
    expect(response.statusCode).toBe(200);

    expect(mockFetch).toHaveBeenCalled();
    const [, options] = mockFetch.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload.messages[0].text).toContain(
      'เข้าใจความรู้สึกของคุณพี่เลยค่ะ'
    );
  });

  it('handles local goodbye keywords with a detailed response', async () => {
    const event = {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        events: [
          {
            type: 'message',
            replyToken: 'mockReplyToken',
            message: {
              type: 'text',
              text: 'ขอบคุณมากครับ ไปละ บ๊ายบาย',
            },
          },
        ],
      }),
    };

    const signature = crypto
      .createHmac('sha256', 'mock-secret')
      .update(event.body)
      .digest('base64');
    event.headers['x-line-signature'] = signature;

    const response = await webhook.handler(event);
    expect(response.statusCode).toBe(200);

    expect(mockFetch).toHaveBeenCalled();
    const [, options] = mockFetch.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload.messages[0].text).toContain(
      'ด้วยความยินดีเป็นอย่างยิ่งเลยค่ะ!'
    );
  });
});
