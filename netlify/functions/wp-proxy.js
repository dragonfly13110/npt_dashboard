// Netlify serverless function to proxy WordPress REST API requests
// Handles CORS issues and authentication

export default async (request, context) => {
    const url = new URL(request.url);
    
    // Extract the target domain and path
    // Pattern: /api/doae-{domain}/* → https://{domain}.doae.go.th/*
    const pathMatch = url.pathname.match(/^\/api\/([^/]+)\/(.*)$/);
    
    if (!pathMatch) {
        return new Response(JSON.stringify({ error: 'Invalid path' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const [, domain, restPath] = pathMatch;
    
    // Map domain prefixes to actual domains
    const domainMap = {
        'doae-hq': 'https://www.doae.go.th',
        'doae-npt': 'https://nakhonpathom.doae.go.th',
        'doae-esc': 'https://esc.doae.go.th',
        'nabc': 'https://agriapi.nabc.go.th',
    };

    const baseUrl = domainMap[domain];
    if (!baseUrl) {
        return new Response(JSON.stringify({ error: 'Unknown domain' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const targetUrl = `${baseUrl}/${restPath}${url.search}`;

    try {
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 10000,
        });

        const body = await response.text();

        return new Response(body, {
            status: response.status,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600', // cache 1 hour for WP posts
            },
        });
    } catch (err) {
        console.error(`WP proxy error for ${domain}:`, err);
        return new Response(JSON.stringify({ error: 'Proxy error', message: err.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config = {
    path: "/api/doae-*",
};
