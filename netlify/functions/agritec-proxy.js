// Netlify serverless function to proxy NSTDA AGRITEC WordPress REST API
// https://www.nstda.or.th/agritec/...
import { corsHeaders, isOriginAllowed } from './lib/http-security.js';

export default async (request) => {
  const origin = request.headers.get('origin') || '';
  const baseHeaders = corsHeaders(origin, { methods: 'GET, OPTIONS' });
  if (request.method === 'OPTIONS')
    return new Response('', { status: 204, headers: baseHeaders });
  if (!isOriginAllowed(origin))
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...baseHeaders, 'Content-Type': 'application/json' },
    });

  const url = new URL(request.url);

  // Remove /api/agritec/ prefix to get the API path
  const apiPath = url.pathname.replace(/^\/api\/agritec\//, '');
  const targetUrl = `https://www.nstda.or.th/agritec/${apiPath}${url.search}`;

  console.log(`[agritec-proxy] Fetching: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    console.log(`[agritec-proxy] Response status: ${response.status}`);
    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type':
          response.headers.get('Content-Type') || 'application/json',
        ...baseHeaders,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error(`[agritec-proxy] Error:`, err.message);
    return new Response(
      JSON.stringify({ error: 'Proxy error', message: err.message }),
      {
        status: 502,
        headers: { ...baseHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};
