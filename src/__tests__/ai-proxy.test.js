import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../netlify/functions/ai-proxy.js';

function request(body, headers = {}) {
  return new Request(
    'https://example.netlify.app/.netlify/functions/ai-proxy',
    {
      method: 'POST',
      headers: {
        origin: 'https://npt.example',
        'content-type': 'application/json',
        'x-forwarded-for': `127.0.0.${Math.floor(Math.random() * 200) + 1}`,
        ...headers,
      },
      body: JSON.stringify(body),
    }
  );
}

describe('ai-proxy', () => {
  beforeEach(() => {
    process.env.ALLOWED_ORIGINS = 'https://npt.example';
    delete process.env.GEMINI_API_KEY;
    delete process.env.VITE_GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.VITE_OPENROUTER_API_KEY;
    delete process.env.NVIDIA_API_KEY;
    delete process.env.VITE_NVIDIA_API_KEY;
    delete process.env.VITE_LANDING_CHATBOT_API_KEY;
    delete process.env.LANDING_CHATBOT_API_KEY;
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('rejects unsupported methods', async () => {
    const response = await handler(
      new Request('https://example.netlify.app/.netlify/functions/ai-proxy', {
        method: 'GET',
      })
    );
    expect(response.status).toBe(405);
  });

  it('rejects origins outside the allowlist', async () => {
    const response = await handler(
      request(
        { provider: 'gemini', body: {} },
        { origin: 'https://evil.example' }
      )
    );
    expect(response.status).toBe(403);
  });

  it('rejects invalid providers', async () => {
    const response = await handler(request({ provider: 'unknown', body: {} }));
    expect(response.status).toBe(400);
  });

  it('rejects configured providers when the server key is missing', async () => {
    const response = await handler(
      request({ provider: 'gemini', body: { model: 'gemini-3.1-flash-lite' } })
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: 'AI provider is not configured',
    });
  });

  it('forwards valid Gemini requests without internal fields', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    fetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const response = await handler(
      request({
        provider: 'gemini',
        body: {
          model: 'gemini-3.1-flash-lite',
          stream: false,
          contents: [{ role: 'user', parts: [{ text: 'hello' }] }],
        },
      })
    );

    expect(response.status).toBe(200);
    const [, init] = fetch.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      contents: [{ role: 'user', parts: [{ text: 'hello' }] }],
    });
  });

  it('allows Gemini 3.5 Flash thinking requests', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    fetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const response = await handler(
      request({
        provider: 'gemini',
        body: {
          model: 'gemini-3.5-flash',
          contents: [
            { role: 'user', parts: [{ text: 'สรุปสถานการณ์จังหวัด' }] },
          ],
          generationConfig: {
            maxOutputTokens: 900,
            thinkingConfig: { thinkingLevel: 'high' },
          },
        },
      })
    );

    expect(response.status).toBe(200);
    expect(fetch.mock.calls[0][0]).toContain(
      '/gemini-3.5-flash:generateContent?'
    );
  });

  it('allows Gemini 3 Flash Preview thinking requests', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    fetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const response = await handler(
      request({
        provider: 'gemini',
        body: {
          model: 'gemini-3-flash-preview',
          contents: [
            { role: 'user', parts: [{ text: 'สรุปสถานการณ์จังหวัด' }] },
          ],
          generationConfig: {
            maxOutputTokens: 900,
            thinkingConfig: { thinkingLevel: 'high' },
          },
        },
      })
    );

    expect(response.status).toBe(200);
    expect(fetch.mock.calls[0][0]).toContain(
      '/gemini-3-flash-preview:generateContent?'
    );
  });
});
