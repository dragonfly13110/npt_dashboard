import { describe, expect, it, vi } from 'vitest';
const {
  createLineAiStore,
} = require('../../netlify/functions/lib/line-ai/store.cjs');

describe('LINE AI store', () => {
  it('loads only latest ten messages inside 24 hours', async () => {
    const range = vi.fn().mockResolvedValue({
      data: [{ role: 'user', content: 'ล่าสุด' }],
      error: null,
    });
    const gte = vi.fn(() => ({ order: () => ({ range }) }));
    const supabase = {
      from: vi.fn(() => ({ select: () => ({ eq: () => ({ gte }) }) })),
    };
    const store = createLineAiStore(supabase);
    await expect(
      store.getHistory('U1', new Date('2026-06-20T10:00:00Z'))
    ).resolves.toHaveLength(1);
    expect(range).toHaveBeenCalledWith(0, 9);
  });

  it('claims quota through atomic RPC', async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({
        data: { allowed: false, reason: 'daily' },
        error: null,
      }),
    };
    const store = createLineAiStore(supabase);
    await expect(
      store.claimQuota('U1', 'ai', { daily: 30, window: 5, seconds: 600 })
    ).resolves.toEqual({ allowed: false, reason: 'daily' });
  });

  it('appends messages and trims content', async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: null });
    const supabase = {
      from: vi.fn(() => ({ insert })),
    };
    const store = createLineAiStore(supabase);
    await store.appendMessage('U1', 'user', 'x'.repeat(5000), 'general');
    expect(supabase.from).toHaveBeenCalledWith('line_conversations');
    expect(insert).toHaveBeenCalledWith({
      line_user_id: 'U1',
      role: 'user',
      content: 'x'.repeat(4000),
      source_type: 'general',
    });
  });

  it('loads one saved preference by LINE user', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { crop: 'ข้าว', district: 'สามพราน' },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const supabase = { from: vi.fn().mockReturnValue({ select }) };

    const store = createLineAiStore(supabase);
    await expect(store.getPreference('U1')).resolves.toEqual({
      crop: 'ข้าว',
      district: 'สามพราน',
    });
    expect(supabase.from).toHaveBeenCalledWith('line_user_preferences');
  });

  it('upserts one normalized preference row', async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const supabase = { from: vi.fn().mockReturnValue({ upsert }) };

    const store = createLineAiStore(supabase);
    await store.savePreference('U1', {
      crop: ' ข้าว ',
      district: 'สามพราน',
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        line_user_id: 'U1',
        crop: 'ข้าว',
        district: 'สามพราน',
      }),
      { onConflict: 'line_user_id' }
    );
  });

  it('clears one saved preference', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const deleteFn = vi.fn().mockReturnValue({ eq });
    const supabase = { from: vi.fn().mockReturnValue({ delete: deleteFn }) };

    const store = createLineAiStore(supabase);
    await store.clearPreference('U1');

    expect(eq).toHaveBeenCalledWith('line_user_id', 'U1');
  });

  it('rejects an unknown district before DB access', async () => {
    const supabase = { from: vi.fn() };
    const store = createLineAiStore(supabase);

    await expect(
      store.savePreference('U1', { crop: 'ข้าว', district: 'กรุงเทพ' })
    ).rejects.toThrow('Invalid district');
    expect(supabase.from).not.toHaveBeenCalled();
  });
  it('gets valid cache entry', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { response: 'hit', expires_at: '2026-06-20T11:00:00Z' },
      error: null,
    });
    const gt = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ gt }));
    const select = vi.fn(() => ({ eq }));
    const supabase = {
      from: vi.fn(() => ({ select })),
    };
    const store = createLineAiStore(supabase);
    await expect(store.getCache('key')).resolves.toEqual({
      response: 'hit',
      expires_at: '2026-06-20T11:00:00Z',
    });
    expect(supabase.from).toHaveBeenCalledWith('line_ai_cache');
  });

  it('puts cache entry via upsert', async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const supabase = {
      from: vi.fn(() => ({ upsert })),
    };
    const store = createLineAiStore(supabase);
    const entry = { cache_key: 'key', response: 'val' };
    await store.putCache(entry);
    expect(upsert).toHaveBeenCalledWith(entry);
  });

  it('lists key health and normalizes statuses', async () => {
    const mockData = [
      {
        key_slot: 1,
        status: 'disabled',
        cooldown_until: null,
        last_used_at: '2026-06-20T08:00:00Z',
      },
      {
        key_slot: 2,
        status: 'active',
        cooldown_until: '2026-06-20T09:00:00Z',
        last_used_at: '2026-06-20T08:30:00Z',
      },
    ];
    const inFn = vi.fn().mockResolvedValue({ data: mockData, error: null });
    const select = vi.fn(() => ({ in: inFn }));
    const supabase = {
      from: vi.fn(() => ({ select })),
    };
    const store = createLineAiStore(supabase);
    const result = await store.listKeyHealth([1, 2, 3]);
    expect(result).toEqual([
      {
        key_slot: 1,
        last_used_at: '2026-06-20T08:00:00Z',
        cooldown_until: null,
        is_disabled: true,
      },
      {
        key_slot: 2,
        last_used_at: '2026-06-20T08:30:00Z',
        cooldown_until: '2026-06-20T09:00:00Z',
        is_disabled: false,
      },
    ]);
  });

  it('marks key used, healthy, and failure', async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const supabase = {
      from: vi.fn(() => ({ upsert })),
    };
    const store = createLineAiStore(supabase);

    await store.markUsed(1, '2026-06-20T09:00:00Z');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key_slot: 1,
        last_used_at: '2026-06-20T09:00:00Z',
      })
    );

    await store.markHealthy(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key_slot: 1,
        status: 'active',
        cooldown_until: null,
      })
    );

    await store.markFailure(1, {
      disabled: true,
      cooldownUntil: '2026-06-20T10:00:00Z',
      status: 429,
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key_slot: 1,
        status: 'disabled',
        cooldown_until: '2026-06-20T10:00:00Z',
        last_error_code: '429',
      })
    );
  });
});
