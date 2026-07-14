import { corsHeaders, isOriginAllowed } from './lib/http-security.js';
import { mergeDistrictWeather } from './lib/smart-map/weather-builders.js';

const DISTRICT_POINTS = [
  ['เมืองนครปฐม', 13.82, 100.04],
  ['กำแพงแสน', 14.01, 99.98],
  ['บางเลน', 14.02, 100.17],
  ['ดอนตูม', 13.98, 100.08],
  ['นครชัยศรี', 13.8, 100.18],
  ['สามพราน', 13.72, 100.22],
  ['พุทธมณฑล', 13.78, 100.32],
].map(([district, lat, lon]) => ({ district, lat, lon }));
const CACHE_TTL_MS = 10 * 60 * 1000;
let cache = null;

function response(origin, status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin, { methods: 'GET, OPTIONS' }),
    },
  });
}

async function fetchJson(url, fetcher) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const result = await fetcher(url, { signal: controller.signal });
    if (!result.ok)
      throw new Error(`Upstream request failed: ${result.status}`);
    return result.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function getWeatherPayload(fetcher = fetch, now = Date.now()) {
  if (cache && now - cache.cachedAt < CACHE_TTL_MS)
    return { ...cache.payload, meta: { ...cache.payload.meta, cached: true } };
  const latitudes = DISTRICT_POINTS.map((point) => point.lat).join(',');
  const longitudes = DISTRICT_POINTS.map((point) => point.lon).join(',');
  const [weather, airQuality] = await Promise.allSettled([
    fetchJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitudes}&longitude=${longitudes}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`,
      fetcher
    ),
    fetchJson(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitudes}&longitude=${longitudes}&current=pm2_5,european_aqi`,
      fetcher
    ),
  ]);
  const payload = mergeDistrictWeather(
    DISTRICT_POINTS,
    weather.status === 'fulfilled' ? weather.value : null,
    airQuality.status === 'fulfilled' ? airQuality.value : null
  );
  payload.meta.updatedAt = new Date(now).toISOString();
  payload.meta.cached = false;
  if (payload.meta.status === 'unavailable' && cache) {
    return {
      ...cache.payload,
      meta: { ...cache.payload.meta, status: 'stale', cached: true },
    };
  }
  if (payload.meta.status !== 'unavailable') cache = { cachedAt: now, payload };
  return payload;
}

export default async (request) => {
  const origin = request.headers.get('origin') || '';
  if (request.method === 'OPTIONS')
    return new Response('', {
      status: 204,
      headers: corsHeaders(origin, { methods: 'GET, OPTIONS' }),
    });
  if (request.method !== 'GET')
    return response(origin, 405, { error: 'Method not allowed' });
  if (!isOriginAllowed(origin))
    return response(origin, 403, { error: 'Origin not allowed' });
  const payload = await getWeatherPayload();
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=600',
      ...corsHeaders(origin, { methods: 'GET, OPTIONS' }),
    },
  });
};

export const config = { path: '/api/public-smart-map-weather' };
