import { describe, expect, it, vi } from 'vitest';
import guestSession from '../../netlify/functions/guest-session';

globalThis.Netlify = {
  env: {
    get: vi.fn((name) =>
      name === 'GUEST_SESSION_SECRET' ? 'test-secret' : ''
    ),
  },
};

function request(method, cookie) {
  return new Request('https://example.test/api/guest-session', {
    method,
    headers: cookie ? { cookie } : {},
  });
}

describe('guest-session function', () => {
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
});
