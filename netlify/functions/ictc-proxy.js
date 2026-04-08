// Netlify serverless function to proxy ICTC WordPress REST API
// https://ictc.doae.go.th/...

export default async (request) => {
    const url = new URL(request.url);
    
    // Remove /api/ictc/ prefix to get the API path
    const apiPath = url.pathname.replace(/^\/api\/ictc\//, '');
    const targetUrl = `https://ictc.doae.go.th/${apiPath}${url.search}`;
    
    console.log(`[ictc-proxy] Fetching: ${targetUrl}`);

    try {
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 10000,
        });

        console.log(`[ictc-proxy] Response status: ${response.status}`);
        const body = await response.text();

        return new Response(body, {
            status: response.status,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (err) {
        console.error(`[ictc-proxy] Error:`, err.message);
        return new Response(JSON.stringify({ error: 'Proxy error', message: err.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config = {
    path: "/api/ictc/*",
};
