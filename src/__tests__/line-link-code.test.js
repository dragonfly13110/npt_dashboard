import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../netlify/functions/line-link-code.js';

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

function request(headers = {}) {
  return new Request('https://example.netlify.app/.netlify/functions/line-link-code', {
    method: 'POST',
    headers: { ...headers },
  });
}

describe('line-link-code function', () => {
  beforeEach(() => {
    process.env.ALLOWED_ORIGINS = 'https://npt.example';
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('rejects missing auth', async () => {
    const response = await handler(request());
    expect(response.status).toBe(401);
  });

  it('rejects invalid auth', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('invalid'),
    });
    const response = await handler(request({ authorization: 'Bearer bad' }));
    expect(response.status).toBe(401);
  });

  it('generates a hashed ten-character code that expires in ten minutes', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'profile-1' } },
      error: null,
    });
    const deleteQuery = { eq: vi.fn(), is: vi.fn() };
    deleteQuery.eq.mockReturnValue(deleteQuery);
    deleteQuery.is.mockResolvedValue({ error: null });
    const insertQuery = { insert: vi.fn() };
    insertQuery.insert.mockResolvedValue({ error: null });
    mockSupabase.from.mockImplementation((table) =>
      table === 'line_link_codes' ? { delete: () => deleteQuery, ...insertQuery } : {}
    );

    const before = Date.now();
    const response = await handler(request({ authorization: 'Bearer good' }));
    const after = Date.now();
    const payload = await response.json();
    const inserted = insertQuery.insert.mock.calls[0][0];

    expect(response.status).toBe(200);
    expect(payload.code).toMatch(/^[A-F0-9]{10}$/);
    expect(payload.command).toBe(`เชื่อม ${payload.code}`);
    expect(inserted.code_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(inserted.code_hash).not.toContain(payload.code);
    expect(new Date(inserted.expires_at).getTime()).toBeGreaterThanOrEqual(
      before + 600000
    );
    expect(new Date(inserted.expires_at).getTime()).toBeLessThanOrEqual(
      after + 600000
    );
  });
});
