import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('registerServiceWorker', () => {
  beforeEach(() => vi.resetModules());

  it('registers /sw.js without waiting for slow page resources', async () => {
    const register = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });
    const { registerServiceWorker } = await import('../registerServiceWorker');
    await registerServiceWorker(true);
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('does not reject app startup when registration fails', async () => {
    const error = new Error('registration failed');
    const register = vi.fn().mockRejectedValue(error);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });
    const { registerServiceWorker } = await import('../registerServiceWorker');
    await expect(registerServiceWorker(true)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      '[PWA] Service worker registration failed',
      error
    );
    warn.mockRestore();
  });
});
