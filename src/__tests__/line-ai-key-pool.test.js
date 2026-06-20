import { inspect } from 'node:util';
import { describe, expect, it, vi } from 'vitest';

const {
  loadConfig,
} = require('../../netlify/functions/lib/line-ai/config.cjs');
const {
  createKeyPool,
} = require('../../netlify/functions/lib/line-ai/key-pool.cjs');

function createStore(records = []) {
  return {
    listKeyHealth: vi.fn(async () => records),
    markUsed: vi.fn(async () => {}),
    markHealthy: vi.fn(async () => {}),
    markFailure: vi.fn(async () => {}),
  };
}

describe('LINE AI Gemini key pool', () => {
  it('orders healthy slots by persistent least-recent use', async () => {
    const store = createStore([
      { key_slot: 1, last_used_at: '2026-06-20T09:00:00.000Z' },
      { key_slot: 2, last_used_at: '2026-06-20T08:00:00.000Z' },
      { key_slot: 3, is_disabled: true },
      { key_slot: 4, cooldown_until: '2026-06-20T10:01:00.000Z' },
    ]);
    const pool = createKeyPool({
      keys: new Map([
        [1, 'secret-one'],
        [2, 'secret-two'],
        [3, 'secret-three'],
        [4, 'secret-four'],
      ]),
      store,
      now: () => new Date('2026-06-20T10:00:00.000Z'),
    });
    const operation = vi.fn(async ({ slot }) => `slot-${slot}`);

    await expect(pool.execute(operation)).resolves.toBe('slot-2');
    expect(operation).toHaveBeenCalledWith({ slot: 2, apiKey: 'secret-two' });
    expect(store.markUsed).toHaveBeenCalledWith(2, '2026-06-20T10:00:00.000Z');
    expect(store.markHealthy).toHaveBeenCalledWith(
      2,
      '2026-06-20T10:00:00.000Z'
    );
  });

  it('records a failure and retries the next healthy slot', async () => {
    const store = createStore([]);
    const pool = createKeyPool({
      keys: new Map([
        [1, 'secret-one'],
        [2, 'secret-two'],
      ]),
      store,
      now: () => new Date('2026-06-20T10:00:00.000Z'),
    });
    const operation = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('upstream failed'), { status: 500 })
      )
      .mockResolvedValueOnce('recovered');

    await expect(pool.execute(operation)).resolves.toBe('recovered');
    expect(operation.mock.calls.map(([argument]) => argument.slot)).toEqual([
      1, 2,
    ]);
    expect(store.markFailure).toHaveBeenCalledWith(1, {
      status: 500,
      disabled: false,
      cooldownUntil: '2026-06-20T10:01:00.000Z',
    });
    expect(store.markHealthy).toHaveBeenCalledWith(
      2,
      '2026-06-20T10:00:00.000Z'
    );
  });

  it('attempts at most two slots and rethrows the original final error', async () => {
    const store = createStore([]);
    const pool = createKeyPool({
      keys: new Map([
        [1, 'one'],
        [2, 'two'],
        [3, 'three'],
      ]),
      store,
      maxAttempts: 99,
    });
    const firstError = new Error('first');
    const secondError = new Error('second');
    const operation = vi
      .fn()
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(secondError);

    await expect(pool.execute(operation)).rejects.toBe(secondError);
    expect(operation).toHaveBeenCalledTimes(2);
    expect(operation.mock.calls.map(([argument]) => argument.slot)).toEqual([
      1, 2,
    ]);
  });

  it.each([401, 403])(
    'permanently disables a slot after HTTP %s',
    async (status) => {
      const store = createStore([]);
      const pool = createKeyPool({ keys: new Map([[1, 'one']]), store });
      const error = Object.assign(new Error('unauthorized'), { status });

      await expect(
        pool.execute(async () => {
          throw error;
        })
      ).rejects.toBe(error);
      expect(store.markFailure).toHaveBeenCalledWith(1, {
        status,
        disabled: true,
        cooldownUntil: null,
      });
    }
  );

  it('places a rate-limited slot on Retry-After cooldown', async () => {
    const store = createStore([]);
    const pool = createKeyPool({
      keys: new Map([[1, 'one']]),
      store,
      now: () => new Date('2026-06-20T10:00:00.000Z'),
    });
    const error = Object.assign(new Error('rate limited'), {
      status: 429,
      response: { status: 429, headers: new Headers({ 'Retry-After': '120' }) },
    });

    await expect(
      pool.execute(async () => {
        throw error;
      })
    ).rejects.toBe(error);
    expect(store.markFailure).toHaveBeenCalledWith(1, {
      status: 429,
      disabled: false,
      cooldownUntil: '2026-06-20T10:02:00.000Z',
    });
  });

  it('fails with NO_HEALTHY_KEY when no configured healthy slot exists', async () => {
    const store = createStore([]);
    const pool = createKeyPool({ keys: new Map(), store });

    await expect(pool.execute(vi.fn())).rejects.toMatchObject({
      code: 'NO_HEALTHY_KEY',
    });
  });
});

describe('LINE AI configuration', () => {
  it('reads server configuration, preferring Netlify.env and collecting five numbered keys', () => {
    const env = {
      GEMINI_API_KEY_1: 'process-one',
      GEMINI_API_KEY_3: 'process-three',
      LINE_AI_ENABLED: 'true',
      LINE_AI_MODEL: 'custom-model',
      LINE_AI_FALLBACK_MODELS: 'fallback-a, fallback-b',
      LINE_AI_DAILY_LIMIT: '40',
      LINE_AI_GROUNDING_DAILY_LIMIT: '6',
      LINE_AI_ROLLING_LIMIT: '7',
      LINE_AI_ROLLING_WINDOW_SECONDS: '700',
      LINE_AI_TIMEOUT_MS: '9000',
      LINE_AI_ADMIN_USER_IDS: 'U1, U2',
    };
    const netlifyEnv = {
      get: vi.fn((name) =>
        name === 'GEMINI_API_KEY_1' ? 'netlify-one' : undefined
      ),
    };

    const config = loadConfig(env, netlifyEnv);

    expect(config.geminiApiKeys).toEqual(
      new Map([
        [1, 'netlify-one'],
        [3, 'process-three'],
      ])
    );
    expect(config).toMatchObject({
      enabled: true,
      model: 'custom-model',
      fallbackModels: ['fallback-a', 'fallback-b'],
      aiDailyLimit: 40,
      groundingDailyLimit: 6,
      rollingLimit: 7,
      rollingWindowSeconds: 700,
      timeoutMs: 9000,
    });
    expect(config.adminUserIds).toEqual(new Set(['U1', 'U2']));
  });

  it('uses safe defaults for missing or invalid positive integer settings', () => {
    const config = loadConfig(
      {
        LINE_AI_ENABLED: 'TRUE',
        LINE_AI_DAILY_LIMIT: '0',
        LINE_AI_GROUNDING_DAILY_LIMIT: '-1',
        LINE_AI_ROLLING_LIMIT: '1.5',
        LINE_AI_ROLLING_WINDOW_SECONDS: 'not-a-number',
        LINE_AI_TIMEOUT_MS: '',
      },
      null
    );

    expect(config).toMatchObject({
      enabled: false,
      model: 'gemini-3.1-flash-lite',
      fallbackModels: ['gemini-2.5-flash-lite'],
      aiDailyLimit: 30,
      groundingDailyLimit: 5,
      rollingLimit: 5,
      rollingWindowSeconds: 600,
      timeoutMs: 8000,
    });
  });

  it('never includes API key values in serialized or inspected configuration', () => {
    const config = loadConfig({ GEMINI_API_KEY_1: 'super-secret-value' }, null);

    expect(JSON.stringify(config)).not.toContain('super-secret-value');
    expect(inspect(config)).not.toContain('super-secret-value');
    expect(JSON.stringify(config)).toContain('configuredKeySlots');
  });
});
