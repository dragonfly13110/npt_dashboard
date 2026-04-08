// Netlify serverless function to proxy NSTDA AGRITEC WordPress REST API
// https://www.nstda.or.th/agritec/...

export default async (request) => {
    const url = new URL(request.url);
    
    // Remove /api/agritec/ prefix to get the API path
    const apiPath = url.pathname.replace(/^\/api\/agritec\//, '');
    const targetUrl = `https://www.nstda.or.th/agritec/${apiPath}${url.search}`;
    
    console.log(`[agritec-proxy] Fetching: ${targetUrl}`);

    try {
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 10000,
        });

        console.log(`[agritec-proxy] Response status: ${response.status}`);
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
        console.error(`[agritec-proxy] Error:`, err.message);
        return new Response(JSON.stringify({ error: 'Proxy error', message: err.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
