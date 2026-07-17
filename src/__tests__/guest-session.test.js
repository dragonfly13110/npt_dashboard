import { beforeEach, describe, expect, it, vi } from 'vitest';
import guestSession from '../../netlify/functions/guest-session';

let env;

globalThis.Netlify = {
  env: {
    get: vi.fn((name) => env[name] || ''),
  },
};

function request(method, cookie) {
  return new Request('https://example.test/api/guest-session', {
    method,
    headers: cookie ? { cookie } : {},
  });
}

describe('guest-session function', () => {
  beforeEach(() => {
    env = { GUEST_SESSION_SECRET: 'g'.repeat(32) };
  });

  it('creates and validates an HttpOnly guest session cookie', async () => {
    const created = await guestSession(request('POST'));
    const cookie = created.headers.get('set-cookie');

    expect(created.status).toBe(200);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');

    const checked = await guestSession(request('GET', cookie));
    await expect(checked.json()).resolves.toMatchObject({ role: 'guest' });
  });

  it('rejects a tampered guest cookie', async () => {
    const checked = await guestSession(
      request('GET', 'npt_guest_session=tampered.token')
    );

    await expect(checked.json()).resolves.toMatchObject({ role: null });
  });

  it('rejects an anon-key fallback as a guest secret', async () => {
    env = { VITE_SUPABASE_ANON_KEY: 'public-anon-key' };

    const response = await guestSession(request('POST'));

    expect(response.status).toBe(503);
  });

  it('rejects guest secrets shorter than 32 bytes', async () => {
    env = { GUEST_SESSION_SECRET: 'short-secret' };

    const response = await guestSession(request('POST'));

    expect(response.status).toBe(503);
  });
});
