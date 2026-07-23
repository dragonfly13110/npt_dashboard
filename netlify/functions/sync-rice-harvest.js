import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { scrapeRiceHarvest } from '../../scripts/scrape_rice_harvest.js';
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

function requireManagementEnv() {
  const projectRef = getEnv('SUPABASE_PROJECT_REF');
  const accessToken = getEnv('SUPABASE_ACCESS_TOKEN');
  if (!projectRef || !accessToken) {
    throw new Error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN');
  }
  return { projectRef, accessToken };
}

function requireSyncEnv() {
  const missing = [
    'DOAE_USERNAME',
    'DOAE_PASSWORD',
    'SUPABASE_PROJECT_REF',
    'SUPABASE_ACCESS_TOKEN',
  ].filter((key) => !getEnv(key));
  if (missing.length) throw new Error(`Missing required env: ${missing.join(', ')}`);
}

async function runSQL(sql) {
  const { projectRef, accessToken } = requireManagementEnv();
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
  if (!response.ok) {
    throw new Error(`DB query failed: ${response.status}`);
  }
  return response.json();
}

async function shouldRun() {
  const rows = await runSQL(`
    select max(scraped_at) as latest_snapshot
    from public.rice_harvest_snapshots;
  `);
  const latestSnapshot = rows?.[0]?.latest_snapshot
    ? new Date(rows[0].latest_snapshot)
    : null;
  if (!latestSnapshot) return true;
  return Date.now() - latestSnapshot.getTime() >= 6.5 * 24 * 60 * 60 * 1000;
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
  if (!token) return jsonResponse(401, { error: 'Missing authorization token' }, origin);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  if (userError || !user) return jsonResponse(401, { error: 'Invalid authorization token' }, origin);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,role')
    .eq('id', user.id)
    .single();
  if (profileError || profile?.role !== 'admin') {
    return jsonResponse(403, { error: 'Only admins can sync rice harvest data' }, origin);
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
        reason: 'Latest snapshot is newer than seven days',
      },
      origin
    );
  }
  await scrapeRiceHarvest();
  return jsonResponse(200, { ok: true, skipped: false }, origin);
}

async function reportSyncFailure(error, context, event) {
  console.error(`sync-rice-harvest ${event} error:`, sanitizeLogValue(error));
  const alert = reportCriticalError({
    functionName: 'sync-rice-harvest',
    event,
    requestId: context?.requestId || 'unavailable',
  });
  if (context?.waitUntil) context.waitUntil(alert);
  else await alert;
}

export async function scheduledSyncRiceHarvest(_event, context) {
  try {
    return await runSync({ force: false });
  } catch (error) {
    await reportSyncFailure(error, context, 'scheduled_sync_failed');
    return jsonResponse(500, { error: error.message || 'Rice harvest sync failed' });
  }
}

export default async function syncRiceHarvest(request, context) {
  const origin = request.headers.get('origin');
  if (!isOriginAllowed(origin)) return jsonResponse(403, { error: 'Origin not allowed' }, origin);
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 204,
      headers: corsHeaders(origin, { headers: 'Authorization, Content-Type' }),
    });
  }
  if (request.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, origin);

  try {
    const authError = await requireAdmin(request, origin);
    if (authError) return authError;
    const body = await request.json().catch(() => ({}));
    if (body.force === true && context?.waitUntil) {
      requireSyncEnv();
      context.waitUntil(
        runSync({ force: true, origin }).catch((error) =>
          reportSyncFailure(error, context, 'manual_sync_failed')
        )
      );
      return jsonResponse(202, { ok: true, queued: true }, origin);
    }
    return await runSync({ force: body.force === true, origin });
  } catch (error) {
    await reportSyncFailure(error, context, 'manual_sync_failed');
    return jsonResponse(500, { error: error.message || 'Rice harvest sync failed' }, origin);
  }
}

export const handler = schedule('0 0 * * 0', scheduledSyncRiceHarvest);
