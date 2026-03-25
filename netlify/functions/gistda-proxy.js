// Netlify serverless function to proxy GISTDA API requests
// This solves CORS & header forwarding issues in production

export default async (request, context) => {
    const url = new URL(request.url);
    
    // Extract the GISTDA path after /api/gistda/
    const gistdaPath = url.pathname.replace(/^\/api\/gistda\//, '');
    const targetUrl = `https://api-gateway.gistda.or.th/${gistdaPath}${url.search}`;

    try {
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: {
                'API-Key': '2lAkC1Ob7uugojJ1JlgHJPveFRdtCRg51qkZazYqh1fmEf18Me2DtLMsWLOT1aMi',
                'accept': 'application/json',
            },
        });

        const body = await response.text();

        return new Response(body, {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=300', // cache 5 minutes
            },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: 'Proxy error', message: err.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config = {
    path: "/api/gistda/*",
};
