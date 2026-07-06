import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { scrapeFarmerRegistry } from '../../scripts/scrape_farmer_registry.js';
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
  const PROJECT_REF = getEnv('SUPABASE_PROJECT_REF');
  const ACCESS_TOKEN = getEnv('SUPABASE_ACCESS_TOKEN');
  if (!PROJECT_REF || !ACCESS_TOKEN) {
    throw new Error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN');
  }
  return { PROJECT_REF, ACCESS_TOKEN };
}

function requireSyncEnv() {
  const missing = [];
  for (const key of [
    'DOAE_USERNAME',
    'DOAE_PASSWORD',
    'SUPABASE_PROJECT_REF',
    'SUPABASE_ACCESS_TOKEN',
  ]) {
    if (!getEnv(key)) missing.push(key);
  }
  if (missing.length) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }
}

async function runSQL(sql) {
  const { PROJECT_REF, ACCESS_TOKEN } = requireManagementEnv();
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`DB query failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function shouldRun() {
  const rows = await runSQL(`
        SELECT MAX(scraped_at) AS latest_snapshot
        FROM farmer_registry_snapshots;
    `);
  const latestSnapshot = rows?.[0]?.latest_snapshot
    ? new Date(rows[0].latest_snapshot)
    : null;
  if (!latestSnapshot) return true;

  const safetyThresholdMs = 2.5 * 24 * 60 * 60 * 1000; // 2.5 days to allow 3-day cron to pass safely
  return Date.now() - latestSnapshot.getTime() >= safetyThresholdMs;
}

async function requireAdmin(request, origin) {
  const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(
      500,
      {
        error:
          'Missing Supabase service configuration. Set SUPABASE_SERVICE_ROLE_KEY on Netlify.',
      },
      origin
    );
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return jsonResponse(401, { error: 'Missing authorization token' }, origin);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return jsonResponse(401, { error: 'Invalid authorization token' }, origin);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return jsonResponse(
      403,
      { error: 'Only admins can sync farmer registry data' },
      origin
    );
  }

  return null;
}

async function runSync({ force = false, origin = null } = {}) {
  const due = force ? true : await shouldRun();
  if (!due) {
    return jsonResponse(
      200,
      {
        ok: true,
        skipped: true,
        reason: 'Latest snapshot is newer than 2.5 days',
      },
      origin
    );
  }

  await scrapeFarmerRegistry();
  return jsonResponse(200, { ok: true, skipped: false }, origin);
}

async function reportManualSyncFailure(err, context) {
  console.error(
    'sync-farmer-registry manual background error:',
    sanitizeLogValue(err)
  );
  await reportCriticalError({
    functionName: 'sync-farmer-registry',
    event: 'manual_sync_failed',
    requestId: context?.requestId || 'unavailable',
  });
}

export async function scheduledSyncFarmerRegistry(_event, context) {
  try {
    return await runSync({ force: false });
  } catch (err) {
    console.error(
      'sync-farmer-registry scheduled error:',
      sanitizeLogValue(err)
    );
    const alert = reportCriticalError({
      functionName: 'sync-farmer-registry',
      event: 'scheduled_sync_failed',
      requestId: context?.requestId || 'scheduled',
    });
    if (context?.waitUntil) context.waitUntil(alert);
    else await alert;
    return jsonResponse(500, {
      error: err.message || 'Farmer registry sync failed',
    });
  }
}

export default async function syncFarmerRegistry(request, context) {
  const origin = request.headers.get('origin');
  if (!isOriginAllowed(origin)) {
    return jsonResponse(403, { error: 'Origin not allowed' }, origin);
  }

  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 204,
      headers: corsHeaders(origin, {
        headers: 'Authorization, Content-Type',
      }),
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, origin);
  }

  try {
    const authError = await requireAdmin(request, origin);
    if (authError) return authError;

    const body = await request.json().catch(() => ({}));
    if (body.force === true && context?.waitUntil) {
      requireSyncEnv();
      context.waitUntil(
        runSync({ force: true, origin }).catch((err) =>
          reportManualSyncFailure(err, context)
        )
      );
      return jsonResponse(202, { ok: true, queued: true }, origin);
    }

    return await runSync({ force: body.force === true, origin });
  } catch (err) {
    console.error('sync-farmer-registry manual error:', sanitizeLogValue(err));
    const alert = reportCriticalError({
      functionName: 'sync-farmer-registry',
      event: 'manual_sync_failed',
      requestId: context?.requestId || 'unavailable',
    });
    if (context?.waitUntil) context.waitUntil(alert);
    else await alert;
    return jsonResponse(
      500,
      { error: err.message || 'Farmer registry sync failed' },
      origin
    );
  }
}

// Runs every 3 days at 00:00 UTC (07:00 AM Thailand time)
export const handler = schedule('0 0 */3 * *', scheduledSyncFarmerRegistry);
