import { createClient } from '@supabase/supabase-js';
import { generateForecast } from './forecast-disease-insect.js';
import { reportCriticalError } from './lib/error-alert.js';
import { corsHeaders, isOriginAllowed } from './lib/http-security.js';

function getHeader(event, name) {
  const target = name.toLowerCase();
  const entry = Object.entries(event?.headers || {}).find(
    ([key]) => key.toLowerCase() === target
  );
  return entry?.[1] || '';
}

function response(statusCode, payload, origin) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(origin, { headers: 'Authorization, Content-Type' }),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  };
}

export const handler = async (event = {}, context) => {
  const origin = getHeader(event, 'origin');
  if (!isOriginAllowed(origin)) {
    return response(403, { error: 'Origin not allowed' }, origin);
  }
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: response(204, {}, origin).headers };
  }
  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' }, origin);
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase service configuration');
    }

    const token = getHeader(event, 'authorization')
      .replace(/^Bearer\s+/i, '')
      .trim();
    if (!token) {
      return response(401, { error: 'Missing authorization token' }, origin);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return response(401, { error: 'Invalid authorization token' }, origin);
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || !['admin', 'editor'].includes(profile?.role)) {
      return response(403, { error: 'Insufficient role' }, origin);
    }

    const result = await generateForecast(event, context);
    return {
      ...result,
      headers: {
        ...(result.headers || {}),
        ...corsHeaders(origin, { headers: 'Authorization, Content-Type' }),
        'Content-Type': 'application/json',
      },
    };
  } catch (error) {
    const alert = reportCriticalError({
      functionName: 'forecast-disease-insect-background',
      event: 'manual_forecast_failed',
      requestId: context?.requestId || 'unavailable',
    });
    if (context?.waitUntil) context.waitUntil(alert);
    else await alert;
    console.error('Forecast background error:', error.message);
    return response(500, { error: 'Forecast request failed' }, origin);
  }
};
