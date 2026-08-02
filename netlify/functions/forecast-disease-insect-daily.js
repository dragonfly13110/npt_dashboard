import { schedule } from '@netlify/functions';

const getEnv = (name) =>
  globalThis.Netlify?.env?.get?.(name) || process.env[name] || '';

export const triggerForecastBackground = async (_event = {}, context = {}) => {
  const siteUrl = getEnv('URL') || getEnv('DEPLOY_PRIME_URL');
  // ponytail: reuse the existing server-only Supabase key instead of adding another secret.
  const schedulerKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!siteUrl || !schedulerKey) {
    throw new Error('Missing site URL or scheduler secret.');
  }

  const response = await fetch(
    `${siteUrl.replace(/\/+$/, '')}/.netlify/functions/forecast-disease-insect-background`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forecast-scheduler-key': schedulerKey,
      },
      body: JSON.stringify({
        scheduled: true,
        requestId: context.requestId || 'scheduled',
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Background forecast dispatch failed: HTTP ${response.status}`
    );
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, dispatched: true }),
  };
};

// Scheduled Functions have a 30s limit; the background function owns the slow AI work.
export const handler = schedule('*/15 * * * *', triggerForecastBackground);
