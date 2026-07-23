import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import syncTbkCultivation, {
  scheduledSyncTbkCultivation,
} from '../../netlify/functions/sync-tbk-cultivation';
import { scrapeTbkCultivation } from '../../scripts/scrape_tbk_cultivation';

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('../../scripts/scrape_tbk_cultivation.js', () => ({
  scrapeTbkCultivation: vi.fn(),
}));

function request(headers = {}) {
  return new Request(
    'https://example.netlify.app/.netlify/functions/sync-tbk-cultivation',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ force: true }),
    }
  );
}

describe('sync-tbk-cultivation function', () => {
  beforeEach(() => {
    process.env.ALLOWED_ORIGINS = 'https://npt.example';
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    process.env.SUPABASE_PROJECT_REF = 'project';
    process.env.SUPABASE_ACCESS_TOKEN = 'token';
    process.env.DOAE_USERNAME = 'user';
    process.env.DOAE_PASSWORD = 'pass';
    vi.stubGlobal('fetch', vi.fn());
    fetch.mockResolvedValue(
      new Response(JSON.stringify([{ latest_snapshot: null }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'user-1', role: 'admin' },
            error: null,
          }),
        })),
      })),
    });
    scrapeTbkCultivation.mockResolvedValue({ rowCount: 448 });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const key of [
      'ALLOWED_ORIGINS',
      'VITE_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_PROJECT_REF',
      'SUPABASE_ACCESS_TOKEN',
      'DOAE_USERNAME',
      'DOAE_PASSWORD',
    ]) {
      delete process.env[key];
    }
  });

  it('rejects manual sync without authorization', async () => {
    const response = await syncTbkCultivation(request());
    expect(response.status).toBe(401);
    expect(scrapeTbkCultivation).not.toHaveBeenCalled();
  });

  it('runs an authorized forced sync', async () => {
    const response = await syncTbkCultivation(
      request({ authorization: 'Bearer admin-token' })
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, skipped: false });
    expect(scrapeTbkCultivation).toHaveBeenCalledOnce();
  });

  it('allows scheduled sync without browser authorization', async () => {
    const response = await scheduledSyncTbkCultivation();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, skipped: false });
    expect(scrapeTbkCultivation).toHaveBeenCalledOnce();
  });
});
