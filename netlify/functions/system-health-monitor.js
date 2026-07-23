import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { reportCriticalError } from './lib/error-alert.js';
import {
  alertUnhealthySystem,
  checkSupabaseHealth,
} from './lib/system-health.js';

export async function scheduledSystemHealthMonitor(_event, context) {
  const requestId = context?.requestId || 'scheduled';
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    await reportCriticalError({
      functionName: 'system-health-monitor',
      event: 'health_unconfigured',
      requestId,
    });
    return { statusCode: 503 };
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const report = await checkSupabaseHealth(supabase);
  await alertUnhealthySystem(report, {
    alert: reportCriticalError,
    requestId,
  });
  console.log(
    JSON.stringify({
      type: 'system_health',
      status: report.status,
      checked_at: report.checkedAt,
      unhealthy_datasets: report.datasets
        .filter((dataset) => dataset.status !== 'healthy')
        .map((dataset) => dataset.id),
    })
  );
  return { statusCode: report.status === 'down' ? 503 : 200 };
}

export const handler = schedule('0 1 * * *', scheduledSystemHealthMonitor);
