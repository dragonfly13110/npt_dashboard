import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { syncGeoplotsProgress } from '../../scripts/sync_geoplots_progress.js';
import { reportCriticalError } from './lib/error-alert.js';

function getEnv(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || '';
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function requireAdmin(request) {
  const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, {
      error: 'Missing Supabase service configuration',
    });
  }

  const token = (request.headers.get('authorization') || '')
    .replace(/^Bearer\s+/i, '')
    .trim();
  if (!token)
    return jsonResponse(401, { error: 'Missing authorization token' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  if (userError || !user)
    return jsonResponse(401, { error: 'Invalid authorization token' });

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profileError || profile?.role !== 'admin') {
    return jsonResponse(403, { error: 'Only admins can sync GEOPLOTS data' });
  }

  return null;
}

export async function scheduledSyncGeoplotsProgress(_event, context) {
  try {
    const rows = await syncGeoplotsProgress();
    return jsonResponse(200, { ok: true, rows: rows.length });
  } catch (err) {
    console.error('sync-geoplots-progress scheduled error:', err);
    const alert = reportCriticalError({
      functionName: 'sync-geoplots-progress',
      event: 'scheduled_sync_failed',
      requestId: context?.requestId || 'scheduled',
    });
    if (context?.waitUntil) context.waitUntil(alert);
    else await alert;
    return jsonResponse(500, { error: err.message || 'GEOPLOTS sync failed' });
  }
}

export default async function syncGeoplotsProgressEndpoint(request) {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const authError = await requireAdmin(request);
  if (authError) return authError;

  const rows = await syncGeoplotsProgress();
  return jsonResponse(200, { ok: true, rows: rows.length });
}

export const handler = schedule('15 0 */3 * *', scheduledSyncGeoplotsProgress);
