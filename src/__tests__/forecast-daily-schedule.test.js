import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { schedule } = vi.hoisted(() => ({
  schedule: vi.fn((_expression, handler) => handler),
}));

vi.mock('@netlify/functions', () => ({ schedule }));

import { handler } from '../../netlify/functions/forecast-disease-insect-daily.js';

describe('scheduled disease forecast trigger', () => {
  beforeEach(() => {
    vi.stubEnv('URL', 'https://npt-dashboard.netlify.app');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 202 }))
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('dispatches generation to the background function', async () => {
    const result = await handler({}, { requestId: 'scheduled-1' });

    expect(fetch).toHaveBeenCalledWith(
      'https://npt-dashboard.netlify.app/.netlify/functions/forecast-disease-insect-background',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-forecast-scheduler-key': 'service-role-key',
        }),
      })
    );
    expect(result.statusCode).toBe(200);
  });
});
