import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { scrapeTbkCultivation } from '../../scripts/scrape_tbk_cultivation.js';
import { reportCriticalError } from './lib/error-alert.js';
import { corsHeaders, isOriginAllowed } from './lib/http-security.js';
import { sanitizeLogValue } from '../../src/utils/logSanitizer.js';

function getEnv(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || '';
}

function jsonResponse(status, payload, origin = null) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(origin, { headers: 'Authorization, Content-Type' }),
      'Content-Type': 'application/json',
    },
  });
}

function managementEnv() {
  const projectRef = getEnv('SUPABASE_PROJECT_REF');
  const accessToken = getEnv('SUPABASE_ACCESS_TOKEN');
  if (!projectRef || !accessToken) {
    throw new Error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN');
  }
  return { projectRef, accessToken };
}

async function runSQL(sql) {
  const { projectRef, accessToken } = managementEnv();
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  if (!response.ok) throw new Error(`DB query failed: ${response.status}`);
  return response.json();
}

async function shouldRun() {
  const rows = await runSQL(`
    select max(scraped_at) as latest_snapshot
    from public.tbk_cultivation_snapshots;
  `);
  const latest = rows?.[0]?.latest_snapshot
    ? new Date(rows[0].latest_snapshot)
    : null;
  return !latest || Date.now() - latest.getTime() >= 12 * 24 * 60 * 60 * 1000;
}

async function requireAdmin(request, origin) {
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      500,
      { error: 'Missing Supabase service configuration.' },
      origin
    );
  }
  const token = (request.headers.get('authorization') || '')
    .replace(/^Bearer\s+/i, '')
    .trim();
  if (!token)
    return jsonResponse(401, { error: 'Missing authorization token' }, origin);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  if (userError || !user)
    return jsonResponse(401, { error: 'Invalid authorization token' }, origin);
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,role')
    .eq('id', user.id)
    .single();
  if (error || profile?.role !== 'admin') {
    return jsonResponse(
      403,
      { error: 'Only admins can sync TBK cultivation data' },
      origin
    );
  }
  return null;
}

async function runSync({ force = false, origin = null } = {}) {
  if (!force && !(await shouldRun())) {
    return jsonResponse(
      200,
      {
        ok: true,
        skipped: true,
        reason: 'Latest snapshot is newer than twelve days',
      },
      origin
    );
  }
  await scrapeTbkCultivation();
  return jsonResponse(200, { ok: true, skipped: false }, origin);
}

async function reportFailure(error, context, event) {
  console.error(`sync-tbk-cultivation ${event}:`, sanitizeLogValue(error));
  const alert = reportCriticalError({
    functionName: 'sync-tbk-cultivation',
    event,
    requestId: context?.requestId || 'unavailable',
  });
  if (context?.waitUntil) context.waitUntil(alert);
  else await alert;
}

export async function scheduledSyncTbkCultivation(_event, context) {
  try {
    return await runSync();
  } catch (error) {
    await reportFailure(error, context, 'scheduled_sync_failed');
    return jsonResponse(500, {
      error: error.message || 'TBK cultivation sync failed',
    });
  }
}

export default async function syncTbkCultivation(request, context) {
  const origin = request.headers.get('origin');
  if (!isOriginAllowed(origin))
    return jsonResponse(403, { error: 'Origin not allowed' }, origin);
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 204,
      headers: corsHeaders(origin, { headers: 'Authorization, Content-Type' }),
    });
  }
  if (request.method !== 'POST')
    return jsonResponse(405, { error: 'Method not allowed' }, origin);

  try {
    const authError = await requireAdmin(request, origin);
    if (authError) return authError;
    const body = await request.json().catch(() => ({}));
    return await runSync({ force: body.force === true, origin });
  } catch (error) {
    await reportFailure(error, context, 'manual_sync_failed');
    return jsonResponse(
      500,
      { error: error.message || 'TBK cultivation sync failed' },
      origin
    );
  }
}

export const handler = schedule('0 0 1,15 * *', scheduledSyncTbkCultivation);
