// netlify/functions/ai-proxy.js
const MAX_BODY_BYTES = 256 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;

const PROVIDERS = {
    gemini: {
        envKey: 'GEMINI_API_KEY',
        models: new Set(['gemini-3.5-flash', 'gemini-3.1-flash-lite-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash']),
    },
    openrouter: {
        envKey: 'OPENROUTER_API_KEY',
        models: new Set(['google/gemma-3-27b-it', 'qwen/qwen3-32b', 'openai/gpt-4o-mini']),
    },
    nvidia: {
        envKey: 'NVIDIA_API_KEY',
        models: new Set(['google/gemma-3-27b-it', 'meta/llama-3.1-8b-instruct']),
    },
};

const requestLog = new Map();

function getEnv(name) {
    return globalThis.Netlify?.env?.get?.(name) || process.env[name] || '';
}

function parseAllowedOrigins() {
    return getEnv('ALLOWED_ORIGINS').split(',').map((origin) => origin.trim()).filter(Boolean);
}

function isLocalOrigin(origin) {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
}

function getCorsHeaders(req) {
    const origin = req.headers.get('origin') || '';
    const allowedOrigins = parseAllowedOrigins();
    const allowOrigin = allowedOrigins.includes(origin) || isLocalOrigin(origin) ? origin : allowedOrigins[0] || '';

    return {
        ...(allowOrigin ? { 'Access-Control-Allow-Origin': allowOrigin } : {}),
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Vary': 'Origin',
    };
}

function jsonResponse(req, status, body) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
}

function isOriginAllowed(req) {
    const origin = req.headers.get('origin');
    if (!origin) return true;
    return parseAllowedOrigins().includes(origin) || isLocalOrigin(origin);
}

function getClientKey(req) {
    return req.headers.get('x-nf-client-connection-ip')
        || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || 'unknown';
}

function isRateLimited(req) {
    const key = getClientKey(req);
    const now = Date.now();
    const entry = requestLog.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

    if (now > entry.resetAt) {
        requestLog.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }

    entry.count += 1;
    requestLog.set(key, entry);
    return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

function validatePayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return { error: 'Invalid JSON payload' };
    }

    const { provider, body } = payload;
    const providerConfig = PROVIDERS[provider];
    if (!providerConfig) return { error: 'Invalid provider' };
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Invalid provider body' };
    if (body.model && !providerConfig.models.has(body.model)) return { error: 'Model is not allowed' };

    return { provider, providerConfig, body };
}

function clampTokenLimits(body) {
    const next = { ...body };
    const max = 4096;

    if (typeof next.max_tokens === 'number') next.max_tokens = Math.min(next.max_tokens, max);
    if (typeof next.maxOutputTokens === 'number') next.maxOutputTokens = Math.min(next.maxOutputTokens, max);
    if (next.generationConfig && typeof next.generationConfig === 'object') {
        next.generationConfig = {
            ...next.generationConfig,
            maxOutputTokens: Math.min(Number(next.generationConfig.maxOutputTokens) || max, max),
        };
    }

    return next;
}

async function callGemini(apiKey, body) {
    const model = body.model || 'gemini-3.1-flash-lite-preview';
    const isStream = body.stream === true;
    const endpoint = isStream ? 'streamGenerateContent?alt=sse&' : 'generateContent?';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${endpoint}key=${apiKey}`;
    const { model: _model, stream: _stream, ...requestBody } = clampTokenLimits(body);

    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
    });
}

async function callOpenRouter(apiKey, body) {
    return fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(clampTokenLimits(body)),
    });
}

async function callNvidia(apiKey, body) {
    return fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': body.stream ? 'text/event-stream' : 'application/json',
        },
        body: JSON.stringify(clampTokenLimits(body)),
    });
}

export default async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: getCorsHeaders(req) });
    }

    if (req.method !== 'POST') return jsonResponse(req, 405, { error: 'Method not allowed' });
    if (!isOriginAllowed(req)) return jsonResponse(req, 403, { error: 'Origin not allowed' });
    if (isRateLimited(req)) return jsonResponse(req, 429, { error: 'Too many requests' });

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonResponse(req, 413, { error: 'Payload too large' });

    try {
        const rawBody = await req.text();
        if (rawBody.length > MAX_BODY_BYTES) return jsonResponse(req, 413, { error: 'Payload too large' });

        const validation = validatePayload(JSON.parse(rawBody));
        if (validation.error) return jsonResponse(req, 400, { error: validation.error });

        const apiKey = getEnv(validation.providerConfig.envKey);
        if (!apiKey) return jsonResponse(req, 500, { error: 'AI provider is not configured' });

        console.log('AI proxy request', {
            provider: validation.provider,
            model: validation.body.model || 'default',
            stream: validation.body.stream === true,
        });

        const upstream = validation.provider === 'gemini'
            ? await callGemini(apiKey, validation.body)
            : validation.provider === 'openrouter'
                ? await callOpenRouter(apiKey, validation.body)
                : await callNvidia(apiKey, validation.body);

        return new Response(upstream.body, {
            status: upstream.status,
            headers: {
                ...getCorsHeaders(req),
                'Content-Type': upstream.headers.get('content-type') || 'application/json',
            },
        });
    } catch (err) {
        console.error('AI Proxy error:', err?.message || err);
        return jsonResponse(req, 500, { error: 'Internal proxy error' });
    }
};

export const config = {
    path: '/.netlify/functions/ai-proxy',
};
