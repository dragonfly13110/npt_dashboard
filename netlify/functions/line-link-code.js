import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, isOriginAllowed } from './lib/http-security.js';

function jsonResponse(origin, status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(origin, { headers: 'Authorization, Content-Type' }),
      'Content-Type': 'application/json',
    },
  });
}

function hashCode(code) {
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

export default async function handler(request) {
  const origin = request.headers.get('origin');
  if (!isOriginAllowed(origin)) return jsonResponse(origin, 403, { error: 'Origin not allowed' });
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 204,
      headers: corsHeaders(origin, { headers: 'Authorization, Content-Type' }),
    });
  }
  if (request.method !== 'POST') {
    return jsonResponse(origin, 405, { error: 'Method not allowed' });
  }

  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return jsonResponse(origin, 500, { error: 'Missing Supabase service configuration' });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = (request.headers.get('authorization') || '')
    .replace(/^Bearer\s+/i, '')
    .trim();
  if (!token) return jsonResponse(origin, 401, { error: 'Missing authorization token' });

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const profileId = authData?.user?.id;
  if (authError || !profileId) {
    return jsonResponse(origin, 401, { error: 'Invalid authorization token' });
  }

  const code = randomBytes(5).toString('hex').toUpperCase();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: deleteError } = await supabase
    .from('line_link_codes')
    .delete()
    .eq('profile_id', profileId)
    .is('used_at', null);
  if (deleteError) return jsonResponse(origin, 500, { error: 'Could not create link code' });

  const { error: insertError } = await supabase.from('line_link_codes').insert({
    profile_id: profileId,
    code_hash: hashCode(code),
    expires_at: expiresAt,
  });
  if (insertError) return jsonResponse(origin, 500, { error: 'Could not create link code' });

  return jsonResponse(origin, 200, {
    code,
    expiresAt,
    command: `เชื่อม ${code}`,
  });
}
