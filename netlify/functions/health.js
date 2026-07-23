import { createClient } from '@supabase/supabase-js';
import { corsHeaders, isOriginAllowed } from './lib/http-security.js';
import { checkSupabaseHealth, FRESHNESS_RULES } from './lib/system-health.js';

function jsonResponse(origin, status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(origin, { methods: 'GET, OPTIONS' }),
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    },
  });
}

export default async function health(request) {
  const origin = request.headers.get('origin');
  if (!isOriginAllowed(origin)) {
    return jsonResponse(origin, 403, { status: 'forbidden' });
  }
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 204,
      headers: corsHeaders(origin, { methods: 'GET, OPTIONS' }),
    });
  }
  if (request.method !== 'GET') {
    return jsonResponse(origin, 405, { status: 'method_not_allowed' });
  }

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return jsonResponse(origin, 503, {
      status: 'down',
      checkedAt: new Date().toISOString(),
      database: { status: 'unconfigured' },
      datasets: [],
    });
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const report = await checkSupabaseHealth(supabase, {
    rules: FRESHNESS_RULES,
  });

  return jsonResponse(origin, report.status === 'down' ? 503 : 200, report);
}

export const config = {
  path: '/api/health',
};
