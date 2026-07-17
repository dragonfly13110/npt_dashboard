import crypto from 'node:crypto';
import { corsHeaders, isOriginAllowed } from './lib/http-security.js';

const COOKIE_NAME = 'npt_guest_session';
const MAX_AGE_SECONDS = 60 * 60 * 8;

function getEnv(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || '';
}

function getSecret() {
  const secret = getEnv('GUEST_SESSION_SECRET');
  return Buffer.byteLength(secret, 'utf8') >= 32 ? secret : '';
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
}

function makeToken(secret) {
  const payload = base64url(
    JSON.stringify({
      role: 'guest',
      exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
      nonce: crypto.randomUUID(),
    })
  );
  return `${payload}.${sign(payload, secret)}`;
}

function verifyToken(token, secret) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return false;

  const expected = sign(payload, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return false;
  }

  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  return data.role === 'guest' && data.exp > Math.floor(Date.now() / 1000);
}

function getCookie(request) {
  const cookie = request.headers.get('cookie') || '';
  return cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
}

function cookieHeader(value, maxAge) {
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`;
}

function jsonResponse(origin, status, payload, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(origin, {
        methods: 'GET, POST, DELETE, OPTIONS',
        headers: 'Content-Type',
      }),
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

export default async (request) => {
  const origin = request.headers.get('origin');
  if (!isOriginAllowed(origin)) {
    return jsonResponse(origin, 403, { error: 'Origin not allowed' });
  }

  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 204,
      headers: corsHeaders(origin, {
        methods: 'GET, POST, DELETE, OPTIONS',
        headers: 'Content-Type',
      }),
    });
  }

  const secret = getSecret();
  if (!secret)
    return jsonResponse(origin, 503, { error: 'Guest session is unavailable' });

  if (request.method === 'POST') {
    const token = makeToken(secret);
    return jsonResponse(
      origin,
      200,
      { ok: true, role: 'guest' },
      { 'Set-Cookie': cookieHeader(token, MAX_AGE_SECONDS) }
    );
  }

  if (request.method === 'GET') {
    return jsonResponse(origin, 200, {
      ok: true,
      role: verifyToken(getCookie(request), secret) ? 'guest' : null,
    });
  }

  if (request.method === 'DELETE') {
    return jsonResponse(
      origin,
      200,
      { ok: true },
      { 'Set-Cookie': cookieHeader('', 0) }
    );
  }

  return jsonResponse(origin, 405, { error: 'Method not allowed' });
};

export const config = {
  path: '/api/guest-session',
};
