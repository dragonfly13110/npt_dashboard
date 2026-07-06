import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { reportCriticalError } from './lib/error-alert.js';
import { corsHeaders, isOriginAllowed } from './lib/http-security.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    'Missing required env for sync-weather. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY.'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const getResponseHeaders = (origin = '') => ({
  ...corsHeaders(origin, { methods: 'GET, POST, OPTIONS' }),
  'Content-Type': 'application/json',
});

const syncWeather = async (context, headers) => {
  console.log('Triggering Daily Weather Sync (Robust Open-Meteo)...');

  try {
    const lat = 13.8196;
    const lon = 100.0602;

    const getISODateNdaysAgo = (n) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      const offset = d.getTimezoneOffset() * 60000;
      const localISOTime = new Date(d - offset).toISOString().slice(0, -1);
      return localISOTime.split('T')[0];
    };

    const start_date = getISODateNdaysAgo(90);
    const end_date = getISODateNdaysAgo(0);

    // 1. Fetch from Archive API
    const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${start_date}&end_date=${end_date}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,rain_sum,wind_speed_10m_max&timezone=Asia%2FBangkok`;
    const archiveRes = await fetch(archiveUrl);
    if (!archiveRes.ok)
      throw new Error(`Archive API Error: ${archiveRes.status}`);
    const archiveData = await archiveRes.json();

    // 2. Fetch from Forecast API
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,rain_sum,wind_speed_10m_max&timezone=Asia%2FBangkok&past_days=7&forecast_days=1`;
    const forecastRes = await fetch(forecastUrl);
    if (!forecastRes.ok)
      throw new Error(`Forecast API Error: ${forecastRes.status}`);
    const forecastData = await forecastRes.json();

    // 3. Merge data
    const merged = {};

    const archDaily = archiveData.daily || {};
    const archTimes = archDaily.time || [];
    archTimes.forEach((time, idx) => {
      const tavg = archDaily.temperature_2m_mean[idx];
      const tmin = archDaily.temperature_2m_min[idx];
      const tmax = archDaily.temperature_2m_max[idx];
      const prcp = archDaily.rain_sum[idx];
      const wspd = archDaily.wind_speed_10m_max[idx];

      if (tavg !== null && tavg !== undefined) {
        merged[time] = {
          date: time,
          tavg,
          tmin,
          tmax,
          prcp: prcp ?? 0,
          wspd,
          pres: null,
        };
      }
    });

    const foreDaily = forecastData.daily || {};
    const foreTimes = foreDaily.time || [];
    foreTimes.forEach((time, idx) => {
      const tavg = foreDaily.temperature_2m_mean[idx];
      const tmin = foreDaily.temperature_2m_min[idx];
      const tmax = foreDaily.temperature_2m_max[idx];
      const prcp = foreDaily.rain_sum[idx];
      const wspd = foreDaily.wind_speed_10m_max[idx];

      if (tavg !== null && tavg !== undefined) {
        merged[time] = {
          date: time,
          tavg,
          tmin,
          tmax,
          prcp: prcp ?? 0,
          wspd,
          pres: null,
        };
      }
    });

    const dbRecords = Object.values(merged);

    if (dbRecords.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'No weather data found' }),
      };
    }

    const { error } = await supabase
      .from('daily_weather')
      .upsert(dbRecords, { onConflict: 'date' });
    if (error) throw error;

    console.log(`Success: Sync'd ${dbRecords.length} robust weather records`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: `Synced ${dbRecords.length} records` }),
    };
  } catch (err) {
    console.error('Sync Error:', err.message);
    const alert = reportCriticalError({
      functionName: 'sync-weather',
      event: 'scheduled_sync_failed',
      requestId: context?.requestId || 'scheduled',
    });
    if (context?.waitUntil) context.waitUntil(alert);
    else await alert;
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

const syncHandler = async (event = {}, context) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = getResponseHeaders(origin);
  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 204, headers, body: '' };
  if (!isOriginAllowed(origin)) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Origin not allowed' }),
    };
  }
  if (event.httpMethod && !['GET', 'POST'].includes(event.httpMethod)) {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  return syncWeather(context, headers);
};

export const handler = schedule('0 22 * * *', syncHandler);
