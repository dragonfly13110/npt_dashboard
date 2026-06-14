/* global Netlify */
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: CORS_HEADERS,
  });
}

function firstHeader(request, names) {
  for (const name of names) {
    const value = request.headers.get(name);
    if (value) return value;
  }
  return null;
}

function getClientIp(request) {
  const forwarded = firstHeader(request, [
    'x-nf-client-connection-ip',
    'client-ip',
    'cf-connecting-ip',
    'x-real-ip',
    'x-forwarded-for',
  ]);

  return forwarded?.split(',')[0]?.trim() || null;
}

function maskIp(ip) {
  if (!ip) return null;
  if (ip.includes(':')) {
    return ip.split(':').slice(0, 4).join(':') + '::/64';
  }
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
}

function hashIp(ip, salt) {
  if (!ip || !salt) return null;
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getGeo(request, context) {
  const geo = context?.geo || {};
  return {
    country_code:
      geo.country?.code ||
      geo.countryCode ||
      firstHeader(request, ['x-nf-geo-country-code', 'x-country-code']),
    country_name:
      geo.country?.name ||
      geo.countryName ||
      firstHeader(request, ['x-nf-geo-country-name', 'x-country-name']),
    region:
      geo.subdivision?.name ||
      geo.region ||
      firstHeader(request, ['x-nf-geo-subdivision-name', 'x-region']),
    city: geo.city || firstHeader(request, ['x-nf-geo-city', 'x-city']),
    timezone:
      geo.timezone || firstHeader(request, ['x-nf-geo-timezone', 'x-timezone']),
    latitude: parseNumber(
      geo.latitude || firstHeader(request, ['x-nf-geo-latitude'])
    ),
    longitude: parseNumber(
      geo.longitude || firstHeader(request, ['x-nf-geo-longitude'])
    ),
  };
}

export default async (request, context) => {
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const SUPABASE_URL = Netlify.env.get('VITE_SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Netlify.env.get(
    'SUPABASE_SERVICE_ROLE_KEY'
  );
  const VISITOR_IP_HASH_SALT = Netlify.env.get('VISITOR_IP_HASH_SALT');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: 'Missing Supabase service config' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const payload = await request.json().catch(() => ({}));
    const ip = getClientIp(request);
    const geo = getGeo(request, context);

    const { data: visitCount, error: countError } = await supabase.rpc(
      'increment_site_visit'
    );
    if (countError) throw countError;

    const { error: insertError } = await supabase
      .from('visitor_events')
      .insert({
        path: String(payload.path || '').slice(0, 500) || null,
        referrer: String(payload.referrer || '').slice(0, 500) || null,
        user_agent: (request.headers.get('user-agent') || '').slice(0, 500),
        ip_hash: hashIp(ip, VISITOR_IP_HASH_SALT),
        ip_prefix: maskIp(ip),
        ...geo,
      });

    if (insertError) throw insertError;

    return jsonResponse(200, {
      ok: true,
      visits: visitCount,
      geo: {
        country_code: geo.country_code,
        region: geo.region,
        city: geo.city,
      },
    });
  } catch (err) {
    console.error('track-visit error:', err);
    return jsonResponse(500, { error: err.message || 'Track visit failed' });
  }
};

export const config = {
  path: '/api/track-visit',
};
