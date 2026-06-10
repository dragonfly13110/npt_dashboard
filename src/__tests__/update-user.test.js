import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../netlify/functions/update-user.js';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase Mock
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

function request(body, headers = {}) {
  return new Request(
    'https://example.netlify.app/.netlify/functions/update-user',
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

describe('update-user serverless function', () => {
  beforeEach(() => {
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('rejects unsupported methods (GET)', async () => {
    const response = await handler(
      new Request(
        'https://example.netlify.app/.netlify/functions/update-user',
        {
          method: 'GET',
        }
      )
    );
    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: 'Method not allowed' });
  });

  it('returns 500 when Supabase environment variables are missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const response = await handler(request({}));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error:
        'Missing Supabase service configuration. Set SUPABASE_SERVICE_ROLE_KEY on Netlify.',
    });
  });

  it('returns 401 when authorization token is missing', async () => {
    const response = await handler(request({}));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'Missing authorization token',
    });
  });

  it('returns 401 when authorization token is invalid', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid token'),
    });
    const response = await handler(
      request({}, { authorization: 'Bearer invalid-token' })
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'Invalid authorization token',
    });
  });

  it('returns 400 when target user_id is not a valid UUID', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'c8be371c-32b0-464a-bf6b-f458e38d0001',
          email: 'admin@test.com',
        },
      },
      error: null,
    });
    const response = await handler(
      request(
        { user_id: 'invalid-uuid' },
        { authorization: 'Bearer valid-token' }
      )
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid user id' });
  });

  it('returns 403 when requester is not an admin', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'c8be371c-32b0-464a-bf6b-f458e38d0009',
          email: 'user@test.com',
        },
      },
      error: null,
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'c8be371c-32b0-464a-bf6b-f458e38d0009', role: 'editor' },
      error: null,
    });
    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return { select: mockSelect };
      }
    });

    const response = await handler(
      request(
        { user_id: 'c8be371c-32b0-464a-bf6b-f458e38d0111' },
        { authorization: 'Bearer valid-token' }
      )
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'Only admins can update users',
    });
  });

  it('returns 404 when target user is not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'c8be371c-32b0-464a-bf6b-f458e38d0001',
          email: 'admin@test.com',
        },
      },
      error: null,
    });

    const mockSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: { id: 'c8be371c-32b0-464a-bf6b-f458e38d0001', role: 'admin' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: new Error('Not found'),
      });

    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return { select: mockSelect };
      }
    });

    const response = await handler(
      request(
        { user_id: 'c8be371c-32b0-464a-bf6b-f458e38d0111' },
        { authorization: 'Bearer valid-token' }
      )
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'User profile not found' });
  });

  it('returns 400 when admin tries to demote themselves', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'c8be371c-32b0-464a-bf6b-f458e38d0001',
          email: 'admin@test.com',
        },
      },
      error: null,
    });

    const mockSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: { id: 'c8be371c-32b0-464a-bf6b-f458e38d0001', role: 'admin' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: 'c8be371c-32b0-464a-bf6b-f458e38d0001', role: 'admin' },
        error: null,
      });

    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return { select: mockSelect };
      }
    });

    const response = await handler(
      request(
        { user_id: 'c8be371c-32b0-464a-bf6b-f458e38d0001', role: 'editor' },
        { authorization: 'Bearer valid-token' }
      )
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error:
        'Cannot demote your own account to prevent administrative lockout.',
    });
  });

  it('returns 400 when trying to demote the last admin', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'c8be371c-32b0-464a-bf6b-f458e38d0001',
          email: 'admin@test.com',
        },
      },
      error: null,
    });

    const mockSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: { id: 'c8be371c-32b0-464a-bf6b-f458e38d0001', role: 'admin' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: 'c8be371c-32b0-464a-bf6b-f458e38d0002', role: 'admin' },
        error: null,
      });

    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi
      .fn()
      .mockImplementationOnce(() => ({ eq: mockEq })) // for requester
      .mockImplementationOnce(() => ({ eq: mockEq })) // for target
      .mockImplementationOnce(() => ({
        eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
      })); // for admin count query

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return { select: mockSelect };
      }
    });

    const response = await handler(
      request(
        { user_id: 'c8be371c-32b0-464a-bf6b-f458e38d0002', role: 'editor' },
        { authorization: 'Bearer valid-token' }
      )
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Cannot change role. At least one administrator is required.',
    });
  });

  it('successfully updates profile and logs to audit log', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'c8be371c-32b0-464a-bf6b-f458e38d0001',
          email: 'admin@test.com',
        },
      },
      error: null,
    });

    const mockSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: { id: 'c8be371c-32b0-464a-bf6b-f458e38d0001', role: 'admin' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: 'c8be371c-32b0-464a-bf6b-f458e38d0111',
          role: 'viewer',
          full_name: 'John',
          department: null,
          position: null,
        },
        error: null,
      });

    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));

    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));
    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      if (table === 'audit_logs') {
        return {
          insert: mockInsert,
        };
      }
    });

    const response = await handler(
      request(
        {
          user_id: 'c8be371c-32b0-464a-bf6b-f458e38d0111',
          full_name: 'John Doe',
          role: 'editor',
          department: 'กลุ่มอารักขาพืช',
          position: 'หัวหน้ากลุ่มงาน',
        },
        { authorization: 'Bearer valid-token' }
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      updated_user_id: 'c8be371c-32b0-464a-bf6b-f458e38d0111',
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'John Doe',
        role: 'editor',
        department: 'กลุ่มอารักขาพืช',
        position: 'หัวหน้ากลุ่มงาน',
      })
    );
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        table_name: 'profiles',
        new_data: {
          full_name: 'John Doe',
          role: 'editor',
          department: 'กลุ่มอารักขาพืช',
          position: 'หัวหน้ากลุ่มงาน',
        },
      })
    );
  });
});
