import { createClient } from '@supabase/supabase-js';
import { corsHeaders, isOriginAllowed } from './lib/http-security.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function jsonResponse(origin, status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(origin, { headers: 'Authorization, Content-Type' }),
      'Content-Type': 'application/json',
    },
  });
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value || ''
  );
}

export default async (request) => {
  const origin = request.headers.get('origin');
  if (!isOriginAllowed(origin)) {
    return jsonResponse(origin, 403, { error: 'Origin not allowed' });
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
    return jsonResponse(origin, 405, { error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(origin, 500, {
      error:
        'Missing Supabase service configuration. Set SUPABASE_SERVICE_ROLE_KEY on Netlify.',
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return jsonResponse(origin, 401, {
        error: 'Missing authorization token',
      });
    }

    const {
      data: { user: requester },
      error: requesterError,
    } = await supabase.auth.getUser(token);

    if (requesterError || !requester) {
      return jsonResponse(origin, 401, {
        error: 'Invalid authorization token',
      });
    }

    const { user_id: targetUserId } = await request.json();
    if (!isUuid(targetUserId)) {
      return jsonResponse(origin, 400, { error: 'Invalid user id' });
    }

    if (targetUserId === requester.id) {
      return jsonResponse(origin, 400, {
        error: 'Admins cannot delete their own account',
      });
    }

    const { data: requesterProfile, error: requesterProfileError } =
      await supabase
        .from('profiles')
        .select('id,email,role')
        .eq('id', requester.id)
        .single();

    if (requesterProfileError || requesterProfile?.role !== 'admin') {
      return jsonResponse(origin, 403, {
        error: 'Only admins can delete users',
      });
    }

    const { data: targetProfile, error: targetProfileError } = await supabase
      .from('profiles')
      .select('id,email,role')
      .eq('id', targetUserId)
      .single();

    if (targetProfileError || !targetProfile) {
      return jsonResponse(origin, 404, { error: 'User profile not found' });
    }

    if (targetProfile.role === 'admin') {
      const { count, error: adminCountError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (adminCountError) throw adminCountError;
      if ((count || 0) <= 1) {
        return jsonResponse(origin, 400, {
          error: 'Cannot delete the last admin account',
        });
      }
    }

    const { error: deleteAuthError } =
      await supabase.auth.admin.deleteUser(targetUserId);
    if (deleteAuthError && deleteAuthError.status !== 404) {
      throw deleteAuthError;
    }

    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', targetUserId);
    if (deleteProfileError) throw deleteProfileError;

    await supabase.from('audit_logs').insert({
      user_id: requester.id,
      user_email: requesterProfile.email || requester.email,
      action: 'DELETE',
      table_name: 'profiles',
      record_id: targetUserId,
      old_data: targetProfile,
      new_data: null,
    });

    return jsonResponse(origin, 200, {
      ok: true,
      deleted_user_id: targetUserId,
      deleted_email: targetProfile.email,
    });
  } catch (err) {
    console.error('delete-user error:', err);
    return jsonResponse(origin, 500, {
      error: err.message || 'Delete user failed',
    });
  }
};

export const config = {
  path: '/api/admin/users/delete',
};
