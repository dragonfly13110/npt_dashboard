import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reportCriticalError } from '../../netlify/functions/lib/error-alert.js';

describe('critical error alerts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    delete process.env.ERROR_ALERT_LINE_USER_IDS;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    delete process.env.ERROR_ALERT_LINE_USER_IDS;
  });

  it('logs but does not send when LINE alert config is absent', async () => {
    const sent = await reportCriticalError({
      functionName: 'ai-proxy',
      event: 'provider_failed',
      requestId: 'req-1',
    });

    expect(sent).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('critical_function_error')
    );
  });

  it('sends one safe LINE text alert per configured recipient', async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'line-token';
    process.env.ERROR_ALERT_LINE_USER_IDS = 'user-1,user-2';
    fetch.mockResolvedValue(new Response('', { status: 200 }));

    const sent = await reportCriticalError({
      functionName: 'update-user',
      event: 'unexpected_failure',
      requestId: 'req-2',
      error: new Error('secret-password'),
      requestBody: { token: 'secret-token' },
    });

    expect(sent).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const [, init] of fetch.mock.calls) {
      const payload = JSON.parse(init.body);
      expect(payload.messages[0].text).toContain('update-user');
      expect(payload.messages[0].text).toContain('unexpected_failure');
      expect(payload.messages[0].text).toContain('req-2');
      expect(payload.messages[0].text).not.toContain('secret-password');
      expect(payload.messages[0].text).not.toContain('secret-token');
    }
  });

  it('does not throw when LINE rejects an alert', async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'line-token';
    process.env.ERROR_ALERT_LINE_USER_IDS = 'user-1';
    fetch.mockResolvedValue(new Response('denied', { status: 500 }));

    await expect(
      reportCriticalError({
        functionName: 'sync-weather',
        event: 'sync_failed',
        requestId: 'scheduled',
      })
    ).resolves.toBe(false);
  });
});
