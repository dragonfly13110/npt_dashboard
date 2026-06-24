import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from '../../netlify/functions/forecast-disease-insect-background.js';
import { generateForecast } from '../../netlify/functions/forecast-disease-insect.js';

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('../../netlify/functions/forecast-disease-insect.js', () => ({
  generateForecast: vi.fn(),
}));

function event(headers = {}) {
  return {
    httpMethod: 'POST',
    headers: {
      origin: 'https://npt.example',
      ...headers,
    },
    body: JSON.stringify({ force: true }),
  };
}

function mockRole(role) {
  const single = vi.fn().mockResolvedValue({ data: { role }, error: null });
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  mockSupabase.from.mockReturnValue({ select });
}

describe('forecast background authorization', () => {
  beforeEach(() => {
    process.env.ALLOWED_ORIGINS = 'https://npt.example';
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockRole('editor');
    generateForecast.mockResolvedValue({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.restoreAllMocks();
  });

  it('rejects unknown browser origins', async () => {
    const response = await handler(event({ origin: 'https://evil.example' }));

    expect(response.statusCode).toBe(403);
    expect(generateForecast).not.toHaveBeenCalled();
  });

  it('rejects requests without a bearer token', async () => {
    const response = await handler(event());

    expect(response.statusCode).toBe(401);
    expect(generateForecast).not.toHaveBeenCalled();
  });

  it('rejects users outside admin and editor roles', async () => {
    mockRole('viewer');

    const response = await handler(
      event({ authorization: 'Bearer user-token' })
    );

    expect(response.statusCode).toBe(403);
    expect(generateForecast).not.toHaveBeenCalled();
  });

  it('runs generation for an authorized editor', async () => {
    const requestEvent = event({ authorization: 'Bearer editor-token' });
    const context = { requestId: 'req-forecast-1' };

    const response = await handler(requestEvent, context);

    expect(response.statusCode).toBe(200);
    expect(generateForecast).toHaveBeenCalledWith(requestEvent, context);
    expect(response.headers['Access-Control-Allow-Origin']).toBe(
      'https://npt.example'
    );
  });
});
