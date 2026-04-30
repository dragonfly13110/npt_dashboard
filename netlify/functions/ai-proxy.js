// netlify/functions/ai-proxy.js
export default async (req) => {
    // 1. CORS headers
    const CORS_HEADERS = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS_HEADERS });
    }

    try {
        const payload = await req.json();
        const { provider, body } = payload;
        
        const OPENROUTER_API_KEY = Netlify.env.get('OPENROUTER_API_KEY') || process.env.VITE_OPENROUTER_API_KEY || '';
        const GEMINI_API_KEY = Netlify.env.get('GEMINI_API_KEY') || process.env.VITE_GEMINI_API_KEY || '';

        if (provider === 'gemini') {
            if (!GEMINI_API_KEY) {
                return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), { status: 500, headers: CORS_HEADERS });
            }

            const model = body.model || 'gemini-3.1-flash-lite-preview';
            const isStream = body.stream === true;
            const endpoint = isStream ? 'streamGenerateContent?alt=sse&' : 'generateContent?';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}key=${GEMINI_API_KEY}`;

            // Remove internal properties before forwarding to Gemini
            const { model: _, stream: __, ...requestBody } = body;

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            return new Response(res.body, {
                status: res.status,
                headers: { 
                    ...CORS_HEADERS, 
                    'Content-Type': res.headers.get('content-type') || (isStream ? 'text/event-stream' : 'application/json')
                }
            });
        }

        if (provider === 'openrouter') {
            if (!OPENROUTER_API_KEY) {
                return new Response(JSON.stringify({ error: 'OpenRouter API key not configured' }), { status: 500, headers: CORS_HEADERS });
            }

            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            return new Response(res.body, {
                status: res.status,
                headers: { ...CORS_HEADERS, 'Content-Type': res.headers.get('content-type') || 'application/json' }
            });
        }

        if (provider === 'nvidia') {
            const NVIDIA_API_KEY = Netlify.env.get('NVIDIA_API_KEY') || process.env.VITE_NVIDIA_API_KEY || '';
            if (!NVIDIA_API_KEY) {
                return new Response(JSON.stringify({ error: 'NVIDIA API key not configured' }), { status: 500, headers: CORS_HEADERS });
            }

            const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${NVIDIA_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': body.stream ? 'text/event-stream' : 'application/json',
                },
                body: JSON.stringify(body),
            });

            return new Response(res.body, {
                status: res.status,
                headers: {
                    ...CORS_HEADERS,
                    'Content-Type': res.headers.get('content-type') || (body.stream ? 'text/event-stream' : 'application/json'),
                }
            });
        }

        return new Response(JSON.stringify({ error: 'Invalid provider' }), { status: 400, headers: CORS_HEADERS });
    } catch (err) {
        console.error('AI Proxy error:', err);
        return new Response(JSON.stringify({ error: 'Internal proxy error', message: err.message }), { status: 500, headers: CORS_HEADERS });
    }
};

export const config = {
    path: "/.netlify/functions/ai-proxy"
};
