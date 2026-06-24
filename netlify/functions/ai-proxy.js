import crypto from 'node:crypto';
import { reportCriticalError } from './lib/error-alert.js';

// netlify/functions/ai-proxy.js
const MAX_BODY_BYTES = 4 * 1024 * 1024; // 4MB to support larger dashboard contexts
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const memoryRateLimits = new Map();

const PROVIDERS = {
  gemini: {
    envKey: 'GEMINI_API_KEY',
    models: new Set([
      'gemini-3.5-flash',
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-3.1-flash-lite-preview',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-1.5-flash',
      'gemma-4-31b-it',
    ]),
  },
  openrouter: {
    envKey: 'OPENROUTER_API_KEY',
    models: new Set(['google/gemma-4-31b-it', 'qwen/qwen3.5-397b-a17b']),
  },
  nvidia: {
    envKey: 'NVIDIA_API_KEY',
    models: new Set([
      'qwen/qwen3.5-397b-a17b',
      'moonshotai/kimi-k2.6',
      'meta/llama-3.1-8b-instruct',
      'meta/llama-4-maverick-17b-128e-instruct',
      'mistralai/ministral-14b-instruct-2512',
      'meta/llama-3.3-70b-instruct',
      'mistralai/mistral-large-3-675b-instruct-2512',
      'deepseek-ai/deepseek-v4-flash',
    ]),
  },
  kku: {
    envKey: 'VITE_LANDING_CHATBOT_API_KEY',
    models: new Set([
      'deepseek-v4-flash',
      'claude-sonnet-4.6',
      'gpt-5.4-mini',
      'gemini-3.5-flash',
      'qwen3.7-max',
      'sonar-pro',
      'llama-4-maverick',
      'deepseek-v4-pro',
      'grok-4.3',
      'gpt-5.4',
      'llama-4-scout',
      'qwen3.7-plus',
      'nova-pro-v1',
      'gemini-3.1-pro-preview',
    ]),
  },
};

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

function getCorsHeaders(req) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = parseAllowedOrigins();
  const allowOrigin =
    allowedOrigins.includes(origin) || isLocalOrigin(origin)
      ? origin
      : allowedOrigins[0] || '';

  return {
    ...(allowOrigin ? { 'Access-Control-Allow-Origin': allowOrigin } : {}),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function jsonResponse(req, status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

function isOriginAllowed(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  return parseAllowedOrigins().includes(origin) || isLocalOrigin(origin);
}

function getClientKey(req) {
  return (
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

function claimMemoryRateLimit(req) {
  // ponytail: per-instance fallback; use Supabase RPC when cross-instance limits matter.
  const now = Date.now();
  const rateKey = getClientKey(req);
  const current = memoryRateLimits.get(rateKey);
  if (!current || current.windowStartedAt + RATE_LIMIT_WINDOW_MS <= now) {
    memoryRateLimits.set(rateKey, { windowStartedAt: now, requestCount: 1 });
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      retry_after_seconds: 0,
    };
  }
  if (current.requestCount < RATE_LIMIT_MAX_REQUESTS) {
    current.requestCount += 1;
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - current.requestCount,
      retry_after_seconds: 0,
    };
  }
  return {
    allowed: false,
    remaining: 0,
    retry_after_seconds: Math.max(
      1,
      Math.ceil((current.windowStartedAt + RATE_LIMIT_WINDOW_MS - now) / 1000)
    ),
  };
}
async function claimPersistentRateLimit(req) {
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const hashSalt = getEnv('VISITOR_IP_HASH_SALT');
  if (!supabaseUrl || !serviceRoleKey || !hashSalt) {
    throw new Error('Missing persistent rate-limit configuration');
  }

  const rateKey = crypto
    .createHash('sha256')
    .update(`${hashSalt}:ai-proxy:${getClientKey(req)}`)
    .digest('hex');
  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/claim_api_rate_limit`,
    {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_rate_key: rateKey,
        p_limit: RATE_LIMIT_MAX_REQUESTS,
        p_window_seconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Rate-limit RPC failed: ${response.status}`);
  }
  const claim = await response.json();
  if (typeof claim?.allowed !== 'boolean') {
    throw new Error('Rate-limit RPC returned an invalid claim');
  }
  return claim;
}

async function alertCritical(context, details) {
  const alert = reportCriticalError({
    ...details,
    requestId: context?.requestId || details.requestId || 'unavailable',
  });
  if (context?.waitUntil) {
    context.waitUntil(alert);
    return;
  }
  await alert;
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { error: 'Invalid JSON payload' };
  }

  const { provider, body } = payload;
  const providerConfig = PROVIDERS[provider];
  if (!providerConfig) return { error: 'Invalid provider' };
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return { error: 'Invalid provider body' };
  if (body.model && !providerConfig.models.has(body.model))
    return { error: 'Model is not allowed' };

  return { provider, providerConfig, body };
}

function clampTokenLimits(body) {
  const next = { ...body };
  const max = 4096;

  if (typeof next.max_tokens === 'number')
    next.max_tokens = Math.min(next.max_tokens, max);
  if (typeof next.maxOutputTokens === 'number')
    next.maxOutputTokens = Math.min(next.maxOutputTokens, max);
  if (next.generationConfig && typeof next.generationConfig === 'object') {
    next.generationConfig = {
      ...next.generationConfig,
      maxOutputTokens: Math.min(
        Number(next.generationConfig.maxOutputTokens) || max,
        max
      ),
    };
  }

  return next;
}

async function callGemini(apiKey, body) {
  const model = body.model || 'gemini-3.1-flash-lite';
  const isStream = body.stream === true;
  const endpoint = isStream
    ? 'streamGenerateContent?alt=sse&'
    : 'generateContent?';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${endpoint}key=${apiKey}`;
  const {
    model: _model,
    stream: _stream,
    ...requestBody
  } = clampTokenLimits(body);

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
}

async function callOpenRouter(apiKey, body) {
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(clampTokenLimits(body)),
  });
}

async function callNvidia(apiKey, body) {
  return fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: body.stream ? 'text/event-stream' : 'application/json',
    },
    body: JSON.stringify(clampTokenLimits(body)),
  });
}

async function callKku(apiKey, body) {
  const baseUrl =
    getEnv('VITE_LANDING_CHATBOT_API_URL') || '/api/kku/okmd/api/v1';
  const upstreamBaseUrl = baseUrl.startsWith('/api/kku/')
    ? `https://gen.ai.kku.ac.th/${baseUrl.replace(/^\/api\/kku\//, '')}`
    : baseUrl;

  return fetch(`${upstreamBaseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(clampTokenLimits(body)),
  });
}

export default async (req, context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }

  if (req.method !== 'POST')
    return jsonResponse(req, 405, { error: 'Method not allowed' });
  if (!isOriginAllowed(req))
    return jsonResponse(req, 403, { error: 'Origin not allowed' });
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES)
    return jsonResponse(req, 413, { error: 'Payload too large' });

  try {
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES)
      return jsonResponse(req, 413, { error: 'Payload too large' });

    const validation = validatePayload(JSON.parse(rawBody));
    if (validation.error)
      return jsonResponse(req, 400, { error: validation.error });

    let apiKey = getEnv(validation.providerConfig.envKey);
    if (!apiKey && validation.provider === 'gemini') {
      apiKey = getEnv('VITE_GEMINI_API_KEY');
    }
    if (!apiKey && validation.provider === 'openrouter') {
      apiKey = getEnv('VITE_OPENROUTER_API_KEY');
    }
    if (!apiKey && validation.provider === 'nvidia') {
      apiKey = getEnv('VITE_NVIDIA_API_KEY');
    }
    if (!apiKey && validation.provider === 'kku') {
      apiKey = getEnv('LANDING_CHATBOT_API_KEY');
    }
    if (!apiKey)
      return jsonResponse(req, 500, { error: 'AI provider is not configured' });

    let rateClaim;
    try {
      rateClaim = await claimPersistentRateLimit(req);
    } catch (rateLimitError) {
      console.error('AI proxy rate-limit error:', rateLimitError.message);
      await alertCritical(context, {
        functionName: 'ai-proxy',
        event: 'rate_limit_unavailable',
      });
      rateClaim = claimMemoryRateLimit(req);
    }
    if (!rateClaim.allowed) {
      const retryAfter = Math.max(
        1,
        Number(rateClaim.retry_after_seconds) || 1
      );
      return jsonResponse(
        req,
        429,
        { error: 'Too many requests' },
        { 'Retry-After': String(retryAfter) }
      );
    }

    console.log('AI proxy request', {
      provider: validation.provider,
      model: validation.body.model || 'default',
      stream: validation.body.stream === true,
    });

    const upstream =
      validation.provider === 'gemini'
        ? await callGemini(apiKey, validation.body)
        : validation.provider === 'openrouter'
          ? await callOpenRouter(apiKey, validation.body)
          : validation.provider === 'nvidia'
            ? await callNvidia(apiKey, validation.body)
            : await callKku(apiKey, validation.body);

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...getCorsHeaders(req),
        'Content-Type':
          upstream.headers.get('content-type') || 'application/json',
      },
    });
  } catch (err) {
    console.error('AI Proxy error:', err?.message || err);
    await alertCritical(context, {
      functionName: 'ai-proxy',
      event: 'provider_request_failed',
    });
    return jsonResponse(req, 500, { error: 'Internal proxy error' });
  }
};

export const config = {
  path: '/.netlify/functions/ai-proxy',
};
