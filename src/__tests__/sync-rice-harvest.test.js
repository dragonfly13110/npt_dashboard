import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import syncRiceHarvest, {
  scheduledSyncRiceHarvest,
} from '../../netlify/functions/sync-rice-harvest.js';
import { scrapeRiceHarvest } from '../../scripts/scrape_rice_harvest.js';

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('../../scripts/scrape_rice_harvest.js', () => ({
  scrapeRiceHarvest: vi.fn(),
}));

function request(body, headers = {}) {
  return new Request(
    'https://example.netlify.app/.netlify/functions/sync-rice-harvest',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }
  );
}

function mockAdminProfile(role = 'admin') {
  const single = vi.fn().mockResolvedValue({
    data: { id: 'user-1', role },
    error: null,
  });
  mockSupabase.from.mockReturnValue({
    select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })),
  });
}

describe('sync-rice-harvest function', () => {
  beforeEach(() => {
    process.env.ALLOWED_ORIGINS = 'https://npt.example';
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    process.env.SUPABASE_PROJECT_REF = 'project-ref';
    process.env.SUPABASE_ACCESS_TOKEN = 'access-token';
    process.env.DOAE_USERNAME = 'doae-user';
    process.env.DOAE_PASSWORD = 'doae-pass';
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
    mockAdminProfile();
    scrapeRiceHarvest.mockResolvedValue({ rowCount: 84 });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const key of [
      'VITE_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_PROJECT_REF',
      'SUPABASE_ACCESS_TOKEN',
      'DOAE_USERNAME',
      'DOAE_PASSWORD',
      'ALLOWED_ORIGINS',
    ]) {
      delete process.env[key];
    }
  });

  it('rejects manual sync without an authorization token', async () => {
    const response = await syncRiceHarvest(request({ force: true }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Missing authorization token' });
    expect(scrapeRiceHarvest).not.toHaveBeenCalled();
  });

  it('runs scraper for an authorized forced manual sync', async () => {
    const response = await syncRiceHarvest(
      request({ force: true }, { authorization: 'Bearer admin-token' })
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, skipped: false });
    expect(scrapeRiceHarvest).toHaveBeenCalledTimes(1);
  });

  it('skips a scheduled sync when the latest snapshot is newer than seven days', async () => {
    fetch.mockResolvedValue(
      new Response(
        JSON.stringify([{ latest_snapshot: new Date().toISOString() }]),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );
    const response = await scheduledSyncRiceHarvest();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      skipped: true,
      reason: 'Latest snapshot is newer than seven days',
    });
    expect(scrapeRiceHarvest).not.toHaveBeenCalled();
  });

  it('allows a scheduled sync without browser authorization', async () => {
    const response = await scheduledSyncRiceHarvest();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, skipped: false });
    expect(scrapeRiceHarvest).toHaveBeenCalledTimes(1);
  });
});
