// Netlify serverless function to proxy KKU AI Chatbot API
// Target: https://gen.ai.kku.ac.th/...

export default async (request) => {
  const url = new URL(request.url);

  // Remove /api/kku/ prefix to get the API path
  const apiPath = url.pathname.replace(/^\/api\/kku\//, '');
  const targetUrl = `https://gen.ai.kku.ac.th/${apiPath}${url.search}`;

  console.log(`[kku-proxy] Fetching: ${targetUrl}`);

  // Read the body from the request for POST/PUT methods
  let body = null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text();
  }

  try {
    const apiKey =
      process.env.LANDING_CHATBOT_API_KEY ||
      process.env.VITE_LANDING_CHATBOT_API_KEY;
    if (!apiKey && !request.headers.get('Authorization')) {
      return new Response(
        JSON.stringify({ error: 'KKU API key is not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Define forwarding headers. We default to using our configured API Key,
    // but respect any authorization passed from the client as well.
    const headers = {
      'Content-Type': 'application/json',
      Authorization: request.headers.get('Authorization') || `Bearer ${apiKey}`,
    };

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });

    console.log(`[kku-proxy] Response status: ${response.status}`);
    const responseBody = await response.text();

    return new Response(responseBody, {
      status: response.status,
      headers: {
        'Content-Type':
          response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
    });
  } catch (err) {
    console.error(`[kku-proxy] Error:`, err.message);
    return new Response(
      JSON.stringify({ error: 'Proxy error', message: err.message }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};

export const config = {
  path: '/api/kku/*',
};
