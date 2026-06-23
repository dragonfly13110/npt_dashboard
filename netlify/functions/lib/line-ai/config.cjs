'use strict';

const inspectSymbol = Symbol.for('nodejs.util.inspect.custom');

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function csv(value, fallback = []) {
  const source =
    value == null || value === '' ? fallback : String(value).split(',');
  return [...source].map((item) => String(item).trim()).filter(Boolean);
}

function loadConfig(env = process.env, netlifyEnv = globalThis.Netlify?.env) {
  const get = (name) => {
    const netlifyValue =
      typeof netlifyEnv?.get === 'function' ? netlifyEnv.get(name) : undefined;
    return netlifyValue == null || netlifyValue === ''
      ? env?.[name]
      : netlifyValue;
  };
  const geminiApiKeys = new Map();
  for (let slot = 1; slot <= 5; slot += 1) {
    const value = get(`GEMINI_API_KEY_${slot}`);
    if (typeof value === 'string' && value.trim())
      geminiApiKeys.set(slot, value.trim());
  }

  const config = {
    enabled: get('LINE_AI_ENABLED') === 'true',
    model: get('LINE_AI_MODEL') || 'gemini-3.1-flash-lite',
    fallbackModels: csv(get('LINE_AI_FALLBACK_MODELS'), [
      'gemini-2.5-flash-lite',
    ]),
    aiDailyLimit: positiveInteger(get('LINE_AI_DAILY_LIMIT'), 30),
    groundingEnabled: get('LINE_AI_GROUNDING_ENABLED') === 'true',
    groundingDailyLimit: positiveInteger(
      get('LINE_AI_GROUNDING_DAILY_LIMIT'),
      5
    ),
    rollingLimit: positiveInteger(get('LINE_AI_ROLLING_LIMIT'), 5),
    rollingWindowSeconds: positiveInteger(
      get('LINE_AI_ROLLING_WINDOW_SECONDS'),
      600
    ),
    timeoutMs: positiveInteger(get('LINE_AI_TIMEOUT_MS'), 25000),
    geminiTimeoutMs: positiveInteger(get('LINE_AI_GEMINI_TIMEOUT_MS'), 15000),
    adminUserIds: new Set(csv(get('LINE_AI_ADMIN_USER_IDS'))),
  };
  Object.defineProperty(config, 'geminiApiKeys', {
    value: geminiApiKeys,
    enumerable: false,
  });
  const safeView = () => ({
    ...config,
    adminUserIds: [...config.adminUserIds],
    configuredKeySlots: [...geminiApiKeys.keys()],
  });
  Object.defineProperty(config, 'toJSON', {
    value: safeView,
    enumerable: false,
  });
  Object.defineProperty(config, inspectSymbol, {
    value: safeView,
    enumerable: false,
  });
  return config;
}

module.exports = { loadConfig, getConfig: loadConfig };
