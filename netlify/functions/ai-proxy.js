/**
 * Netlify Serverless Function: AI Proxy
 * 
 * Proxies AI API requests to OpenRouter and Google Gemini
 * so that API keys are never exposed in the client-side bundle.
 * 
 * POST /.netlify/functions/ai-proxy
 * Body: { provider: "openrouter" | "gemini", body: { ... } }
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const { provider, body } = JSON.parse(event.body);

        if (provider === 'openrouter') {
            if (!OPENROUTER_API_KEY) {
                return {
                    statusCode: 500,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ error: 'OpenRouter API key not configured' }),
                };
            }

            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            return {
                statusCode: res.status,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            };
        }

        if (provider === 'gemini') {
            if (!GEMINI_API_KEY) {
                return {
                    statusCode: 500,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ error: 'Gemini API key not configured' }),
                };
            }

            const model = body.model || 'gemini-3.1-flash-lite-preview';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

            // Remove model from body before forwarding
            const { model: _, ...requestBody } = body;

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            const data = await res.json();
            return {
                statusCode: res.status,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            };
        }

        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Invalid provider. Use "openrouter" or "gemini".' }),
        };
    } catch (err) {
        console.error('AI Proxy error:', err);
        return {
            statusCode: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal proxy error', message: err.message }),
        };
    }
};
