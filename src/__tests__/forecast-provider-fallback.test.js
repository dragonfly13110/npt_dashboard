import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.LANDING_CHATBOT_API_KEY = 'stale-kku-key';
  process.env.GEMINI_API_KEY_1 = 'gemini-key';
  process.env.ALLOWED_ORIGINS = 'https://npt.example';
});

const { from, upsert, reportCriticalError } = vi.hoisted(() => {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table) => {
    const rows =
      table === 'daily_weather' || table === 'pest_outbreaks' ? [] : null;
    const query = {
      select: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => Promise.resolve({ data: rows, error: null })),
      upsert,
    };
    return query;
  });
  const reportCriticalError = vi.fn(() => Promise.resolve());
  return { from, upsert, reportCriticalError };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from })),
}));

vi.mock('../../netlify/functions/lib/error-alert.js', () => ({
  reportCriticalError,
}));

import { generateForecast } from '../../netlify/functions/forecast-disease-insect.js';

describe('forecast AI provider fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to Gemini when KKU rejects its API key', async () => {
    const fetchMock = vi.fn((url) => {
      if (url.includes('open-meteo.com')) {
        return Promise.resolve(new Response('{}', { status: 200 }));
      }
      if (url.includes('gen.ai.kku.ac.th')) {
        return Promise.resolve(
          new Response('{"error":"Invalid API key"}', { status: 401 })
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: '{"summary":"ok","details":[]}' }],
                },
                groundingMetadata: {
                  groundingChunks: [
                    { web: { uri: 'https://example.test/source' } },
                  ],
                },
              },
            ],
          }),
          { status: 200 }
        )
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await generateForecast({
      httpMethod: 'POST',
      headers: { origin: 'https://npt.example' },
      body: JSON.stringify({ date: '2026-08-03', force: true }),
    });

    expect(response.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toContain(
      'generativelanguage.googleapis.com'
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.stringContaining('gemini-'),
        generation_mode: 'google_search_grounded',
      }),
      { onConflict: 'forecast_date' }
    );
    expect(reportCriticalError).not.toHaveBeenCalled();
  });
});
