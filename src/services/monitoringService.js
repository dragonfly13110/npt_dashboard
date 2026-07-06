import * as Sentry from '@sentry/react';
import { sanitizeLogValue } from '../utils/logSanitizer';

const defaultEnv = import.meta.env || {};

let monitoringEnabled = false;

export function initMonitoring(env = defaultEnv) {
  const dsn = env.VITE_SENTRY_DSN;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: env.VITE_APP_ENV || env.MODE || 'production',
    release: env.VITE_SENTRY_RELEASE,
    tracesSampleRate: Number(env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0),
    beforeSend: (event) => sanitizeLogValue(event),
  });
  monitoringEnabled = true;
  return true;
}

export function captureError(error, context = {}) {
  if (!monitoringEnabled) return null;
  return Sentry.captureException(error, sanitizeLogValue(context));
}
