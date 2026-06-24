function getEnv(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || '';
}

function parseAllowedOrigins() {
  return getEnv('ALLOWED_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isLocalOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
}

export function isOriginAllowed(origin) {
  if (!origin) return true;
  return isLocalOrigin(origin) || parseAllowedOrigins().includes(origin);
}

export function corsHeaders(
  origin,
  { methods = 'POST, OPTIONS', headers = 'Content-Type' } = {}
) {
  return {
    ...(origin && isOriginAllowed(origin)
      ? { 'Access-Control-Allow-Origin': origin }
      : {}),
    'Access-Control-Allow-Headers': headers,
    'Access-Control-Allow-Methods': methods,
    Vary: 'Origin',
  };
}
