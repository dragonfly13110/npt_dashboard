import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../netlify/functions/ai-proxy.js';
import { reportCriticalError } from '../../netlify/functions/lib/error-alert.js';

vi.mock('../../netlify/functions/lib/error-alert.js', () => ({
  reportCriticalError: vi.fn(),
}));

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

function mockAllowedRateClaim() {
  fetch.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        allowed: true,
        remaining: 29,
        retry_after_seconds: 0,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )
  );
}

describe('ai-proxy', () => {
  beforeEach(() => {
    process.env.ALLOWED_ORIGINS = 'https://npt.example';
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.VISITOR_IP_HASH_SALT = 'test-rate-limit-salt';
    delete process.env.GEMINI_API_KEY;
    delete process.env.VITE_GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.VITE_OPENROUTER_API_KEY;
    delete process.env.NVIDIA_API_KEY;
    delete process.env.VITE_NVIDIA_API_KEY;
    delete process.env.VITE_LANDING_CHATBOT_API_KEY;
    delete process.env.LANDING_CHATBOT_API_KEY;
    vi.stubGlobal('fetch', vi.fn());
    reportCriticalError.mockResolvedValue(false);
  });

  afterEach(() => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.VISITOR_IP_HASH_SALT;
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

  it('returns 429 without calling the provider when the persistent claim is denied', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          allowed: false,
          remaining: 0,
          retry_after_seconds: 17,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    const response = await handler(
      request({ provider: 'gemini', body: { model: 'gemini-3.1-flash-lite' } })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('17');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns 503 without calling the provider when the rate-limit store fails', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    fetch.mockRejectedValueOnce(new Error('database unavailable'));

    const response = await handler(
      request({ provider: 'gemini', body: { model: 'gemini-3.1-flash-lite' } })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'Rate limit service unavailable',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(reportCriticalError).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'ai-proxy',
        event: 'rate_limit_unavailable',
      })
    );
  });

  it('queues a critical alert when an AI provider request throws', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockAllowedRateClaim();
    fetch.mockRejectedValueOnce(new Error('provider offline'));
    const waitUntil = vi.fn();

    const response = await handler(
      request({ provider: 'gemini', body: { model: 'gemini-3.1-flash-lite' } }),
      { requestId: 'req-ai-1', waitUntil }
    );

    expect(response.status).toBe(500);
    expect(reportCriticalError).toHaveBeenCalledWith({
      functionName: 'ai-proxy',
      event: 'provider_request_failed',
      requestId: 'req-ai-1',
    });
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  it('forwards valid Gemini requests without internal fields', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockAllowedRateClaim();
    fetch.mockResolvedValueOnce(
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
    const [, init] = fetch.mock.calls[1];
    expect(JSON.parse(init.body)).toEqual({
      contents: [{ role: 'user', parts: [{ text: 'hello' }] }],
    });
  });

  it('allows Gemini 3.5 Flash thinking requests', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockAllowedRateClaim();
    fetch.mockResolvedValueOnce(
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
    expect(fetch.mock.calls[1][0]).toContain(
      '/gemini-3.5-flash:generateContent?'
    );
  });

  it('allows Gemini 3 Flash Preview thinking requests', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockAllowedRateClaim();
    fetch.mockResolvedValueOnce(
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
    expect(fetch.mock.calls[1][0]).toContain(
      '/gemini-3-flash-preview:generateContent?'
    );
  });

  it('forwards valid NVIDIA requests for the new models', async () => {
    process.env.NVIDIA_API_KEY = 'test-nvidia-key';
    mockAllowedRateClaim();
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const response = await handler(
      request({
        provider: 'nvidia',
        body: {
          model: 'meta/llama-4-maverick-17b-128e-instruct',
          messages: [{ role: 'user', content: 'hello' }],
        },
      })
    );

    expect(response.status).toBe(200);
    const [url, init] = fetch.mock.calls[1];
    expect(url).toBe('https://integrate.api.nvidia.com/v1/chat/completions');
    expect(JSON.parse(init.body).model).toBe(
      'meta/llama-4-maverick-17b-128e-instruct'
    );
  });

  it('forwards valid KKU requests for the landing chatbot through the server key', async () => {
    process.env.LANDING_CHATBOT_API_KEY = 'test-kku-key';
    mockAllowedRateClaim();
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const response = await handler(
      request({
        provider: 'kku',
        body: {
          model: 'deepseek-v4-flash',
          messages: [{ role: 'user', content: 'hello' }],
          max_tokens: 1000,
        },
      })
    );

    expect(response.status).toBe(200);
    const [url, init] = fetch.mock.calls[1];
    expect(url).toBe('https://gen.ai.kku.ac.th/okmd/api/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer test-kku-key');
  });
});
