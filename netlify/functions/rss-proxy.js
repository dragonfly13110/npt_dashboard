// Netlify serverless function to proxy RSS feed requests
// Handles CORS issues and external feed fetching

export default async (request, context) => {
    const url = new URL(request.url);
    
    // Extract the feed key after /api/rss/
    const feedKey = url.pathname.replace(/^\/api\/rss\//, '').split('/')[0];
    
    // Clean up feed key (remove trailing slashes)
    const feedSources = {
        'moac': 'https://www.opsmoac.go.th/all_rss/news-all-382791791793.xml',
        'kasetorganic': 'https://www.kasetorganic.com/feed/',
        'kasetkaoklai': 'https://www.kasetkaoklai.com/home/feed',
        'kasettumkin': 'https://kasettumkin.com/feed',
        'thairath': 'https://www.thairath.co.th/rss/agriculture',
        'agrinewsthai': 'https://www.agrinewsthai.com/feed',
    };

    const targetUrl = feedSources[feedKey];

    if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'Unknown feed' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            timeout: 8000,
        });

        if (!response.ok) {
            return new Response(JSON.stringify({ error: `Feed fetch failed: ${response.status}` }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await response.text();

        return new Response(body, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600', // cache 1 hour
            },
        });
    } catch (err) {
        console.error(`RSS proxy error for ${feedKey}:`, err);
        return new Response(JSON.stringify({ error: 'Proxy error', message: err.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config = {
    path: "/api/rss/*",
};
