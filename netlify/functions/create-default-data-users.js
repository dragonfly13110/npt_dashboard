import { createClient } from '@supabase/supabase-js';
import { reportCriticalError } from './lib/error-alert.js';
import { corsHeaders, isOriginAllowed } from './lib/http-security.js';

const GROUP_ACCOUNTS = [
  [
    'strategy-data@npt-dashboard.local',
    'ผู้ดูแลข้อมูลกลุ่มยุทธศาสตร์และสารสนเทศ',
    'editor',
    'กลุ่มยุทธศาสตร์และสารสนเทศ',
  ],
  [
    'production-data@npt-dashboard.local',
    'ผู้ดูแลข้อมูลกลุ่มส่งเสริมและพัฒนาการผลิต',
    'editor',
    'กลุ่มส่งเสริมและพัฒนาการผลิต',
  ],
  [
    'development-data@npt-dashboard.local',
    'ผู้ดูแลข้อมูลกลุ่มส่งเสริมและพัฒนาเกษตรกร',
    'editor',
    'กลุ่มส่งเสริมและพัฒนาเกษตรกร',
  ],
  [
    'protection-data@npt-dashboard.local',
    'ผู้ดูแลข้อมูลกลุ่มอารักขาพืช',
    'editor',
    'กลุ่มอารักขาพืช',
  ],
  [
    'admin-data@npt-dashboard.local',
    'ผู้ดูแลข้อมูลฝ่ายบริหารทั่วไป',
    'editor',
    'ฝ่ายบริหารทั่วไป',
  ],
];

const DISTRICT_ACCOUNTS = [
  [
    'district-mueang@npt-dashboard.local',
    'ผู้ดูแลข้อมูลอำเภอเมืองนครปฐม',
    'เมืองนครปฐม',
  ],
  [
    'district-kamphaengsaen@npt-dashboard.local',
    'ผู้ดูแลข้อมูลอำเภอกำแพงแสน',
    'กำแพงแสน',
  ],
  [
    'district-nakhonchaisi@npt-dashboard.local',
    'ผู้ดูแลข้อมูลอำเภอนครชัยศรี',
    'นครชัยศรี',
  ],
  ['district-dontum@npt-dashboard.local', 'ผู้ดูแลข้อมูลอำเภอดอนตูม', 'ดอนตูม'],
  [
    'district-banglen@npt-dashboard.local',
    'ผู้ดูแลข้อมูลอำเภอบางเลน',
    'บางเลน',
  ],
  [
    'district-samphran@npt-dashboard.local',
    'ผู้ดูแลข้อมูลอำเภอสามพราน',
    'สามพราน',
  ],
  [
    'district-phutthamonthon@npt-dashboard.local',
    'ผู้ดูแลข้อมูลอำเภอพุทธมณฑล',
    'พุทธมณฑล',
  ],
].map(([email, fullName, department]) => [
  email,
  fullName,
  'district_editor',
  department,
]);

function jsonResponse(origin, status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(origin, { headers: 'Authorization, Content-Type' }),
      'Content-Type': 'application/json',
    },
  });
}

function temporaryPassword() {
  return `Npt-${crypto.randomUUID().replaceAll('-', '').slice(0, 14)}!`;
}

async function requireAdmin(supabase, token) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,email,role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin' ? { user, profile } : null;
}

async function ensureAccount(supabase, account) {
  const [email, fullName, role, department] = account;
  const password = temporaryPassword();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    const existing = await supabase
      .from('profiles')
      .select('id,email')
      .eq('email', email)
      .maybeSingle();

    if (!existing.data?.id) throw error;

    await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        role,
        department,
        position:
          role === 'district_editor'
            ? 'ผู้ดูแลข้อมูลอำเภอ'
            : 'ผู้ดูแลข้อมูลกลุ่ม',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.data.id);

    return { email, full_name: fullName, role, department, status: 'existing' };
  }

  const userId = data.user.id;
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    email,
    full_name: fullName,
    role,
    department,
    position:
      role === 'district_editor' ? 'ผู้ดูแลข้อมูลอำเภอ' : 'ผู้ดูแลข้อมูลกลุ่ม',
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;

  return {
    email,
    password,
    full_name: fullName,
    role,
    department,
    status: 'created',
  };
}

export default async (request, context) => {
  const origin = request.headers.get('origin');
  if (!isOriginAllowed(origin)) {
    return jsonResponse(origin, 403, { error: 'Origin not allowed' });
  }

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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return jsonResponse(origin, 500, {
      error: 'Missing Supabase service configuration.',
    });
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const token = (request.headers.get('authorization') || '')
      .replace(/^Bearer\s+/i, '')
      .trim();
    const requester = token ? await requireAdmin(supabase, token) : null;
    if (!requester) {
      return jsonResponse(origin, 403, {
        error: 'Only admins can create users',
      });
    }

    const accounts = [...GROUP_ACCOUNTS, ...DISTRICT_ACCOUNTS];
    const results = [];
    for (const account of accounts) {
      results.push(await ensureAccount(supabase, account));
    }

    await supabase.from('audit_logs').insert({
      user_id: requester.user.id,
      user_email: requester.profile.email || requester.user.email,
      action: 'CREATE',
      table_name: 'profiles',
      record_id: 'default-data-users',
      old_data: null,
      new_data: { accounts: results.map(({ password, ...row }) => row) },
    });

    return jsonResponse(origin, 200, { ok: true, accounts: results });
  } catch (err) {
    console.error('create-default-data-users error:', err);
    const alert = reportCriticalError({
      functionName: 'create-default-data-users',
      event: 'create_failed',
      requestId: context?.requestId || 'unavailable',
    });
    if (context?.waitUntil) context.waitUntil(alert);
    else await alert;
    return jsonResponse(origin, 500, {
      error: err.message || 'Create default users failed',
    });
  }
};

export const config = {
  path: '/api/admin/users/create-default-data-users',
};
