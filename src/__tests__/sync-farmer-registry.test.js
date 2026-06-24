import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import syncFarmerRegistry, {
  scheduledSyncFarmerRegistry,
} from '../../netlify/functions/sync-farmer-registry.js';
import { scrapeFarmerRegistry } from '../../scripts/scrape_farmer_registry.js';

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('../../scripts/scrape_farmer_registry.js', () => ({
  scrapeFarmerRegistry: vi.fn(),
}));

function request(body, headers = {}) {
  return new Request(
    'https://example.netlify.app/.netlify/functions/sync-farmer-registry',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    }
  );
}

function mockAdminProfile(role = 'admin') {
  const single = vi.fn().mockResolvedValue({
    data: { id: 'user-1', role },
    error: null,
  });
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  mockSupabase.from.mockReturnValue({ select });
}

describe('sync-farmer-registry function', () => {
  beforeEach(() => {
    process.env.ALLOWED_ORIGINS = 'https://npt.example';
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    process.env.SUPABASE_PROJECT_REF = 'project-ref';
    process.env.SUPABASE_ACCESS_TOKEN = 'access-token';
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
    scrapeFarmerRegistry.mockResolvedValue();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_PROJECT_REF;
    delete process.env.SUPABASE_ACCESS_TOKEN;
    delete process.env.ALLOWED_ORIGINS;
  });

  it('rejects browser origins outside the allowlist', async () => {
    const response = await syncFarmerRegistry(
      request({ force: true }, { origin: 'https://evil.example' })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Origin not allowed' });
    expect(scrapeFarmerRegistry).not.toHaveBeenCalled();
  });

  it('rejects manual sync without an authorization token', async () => {
    const response = await syncFarmerRegistry(request({ force: true }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'Missing authorization token',
    });
    expect(scrapeFarmerRegistry).not.toHaveBeenCalled();
  });

  it('rejects manual sync for non-admin users', async () => {
    mockAdminProfile('editor');

    const response = await syncFarmerRegistry(
      request({ force: true }, { authorization: 'Bearer user-token' })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'Only admins can sync farmer registry data',
    });
    expect(scrapeFarmerRegistry).not.toHaveBeenCalled();
  });

  it('runs scraper for authorized forced manual sync', async () => {
    const response = await syncFarmerRegistry(
      request({ force: true }, { authorization: 'Bearer admin-token' })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, skipped: false });
    expect(scrapeFarmerRegistry).toHaveBeenCalledTimes(1);
  });

  it('surfaces scraper failures instead of reporting success', async () => {
    scrapeFarmerRegistry.mockRejectedValue(new Error('login failed'));

    const response = await syncFarmerRegistry(
      request({ force: true }, { authorization: 'Bearer admin-token' })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'login failed' });
  });

  it('allows scheduled sync without a browser authorization token', async () => {
    const response = await scheduledSyncFarmerRegistry();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, skipped: false });
    expect(scrapeFarmerRegistry).toHaveBeenCalledTimes(1);
  });
});
