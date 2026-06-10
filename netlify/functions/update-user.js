import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: CORS_HEADERS,
  });
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value || ''
  );
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, {
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
      return jsonResponse(401, { error: 'Missing authorization token' });
    }

    const {
      data: { user: requester },
      error: requesterError,
    } = await supabase.auth.getUser(token);

    if (requesterError || !requester) {
      return jsonResponse(401, { error: 'Invalid authorization token' });
    }

    const {
      user_id: targetUserId,
      full_name,
      role,
      department,
      position,
    } = await request.json();
    if (!isUuid(targetUserId)) {
      return jsonResponse(400, { error: 'Invalid user id' });
    }

    // Verify requester has admin role
    const { data: requesterProfile, error: requesterProfileError } =
      await supabase
        .from('profiles')
        .select('id,email,role')
        .eq('id', requester.id)
        .single();

    if (requesterProfileError || requesterProfile?.role !== 'admin') {
      return jsonResponse(403, { error: 'Only admins can update users' });
    }

    // Verify target user exists
    const { data: targetProfile, error: targetProfileError } = await supabase
      .from('profiles')
      .select('id,email,role,full_name,department,position')
      .eq('id', targetUserId)
      .single();

    if (targetProfileError || !targetProfile) {
      return jsonResponse(404, { error: 'User profile not found' });
    }

    // Prevent demoting self if it is the only admin
    if (targetUserId === requester.id && role !== 'admin') {
      return jsonResponse(400, {
        error:
          'Cannot demote your own account to prevent administrative lockout.',
      });
    }

    // If target is currently admin and role changes to non-admin, verify there is at least one other admin
    if (targetProfile.role === 'admin' && role !== 'admin') {
      const { count, error: adminCountError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (adminCountError) throw adminCountError;
      if ((count || 0) <= 1) {
        return jsonResponse(400, {
          error: 'Cannot change role. At least one administrator is required.',
        });
      }
    }

    // Update target profile
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({
        full_name:
          full_name !== undefined ? full_name : targetProfile.full_name,
        role: role !== undefined ? role : targetProfile.role,
        department:
          department !== undefined ? department : targetProfile.department,
        position: position !== undefined ? position : targetProfile.position,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId);

    if (updateProfileError) throw updateProfileError;

    // Log the audit event
    await supabase.from('audit_logs').insert({
      user_id: requester.id,
      user_email: requesterProfile.email || requester.email,
      action: 'UPDATE',
      table_name: 'profiles',
      record_id: targetUserId,
      old_data: targetProfile,
      new_data: {
        full_name:
          full_name !== undefined ? full_name : targetProfile.full_name,
        role: role !== undefined ? role : targetProfile.role,
        department:
          department !== undefined ? department : targetProfile.department,
        position: position !== undefined ? position : targetProfile.position,
      },
    });

    return jsonResponse(200, {
      ok: true,
      updated_user_id: targetUserId,
    });
  } catch (err) {
    console.error('update-user error:', err);
    return jsonResponse(500, { error: err.message || 'Update user failed' });
  }
};

export const config = {
  path: '/api/admin/users/update',
};
