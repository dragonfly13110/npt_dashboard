import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('registerServiceWorker', () => {
  beforeEach(() => vi.resetModules());

  it('registers /sw.js after the load event', async () => {
    const register = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });
    const { registerServiceWorker } = await import('../registerServiceWorker');
    const pending = registerServiceWorker(true);
    window.dispatchEvent(new Event('load'));
    await pending;
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });
});
