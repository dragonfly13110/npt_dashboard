import { describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(() => 'event-id'),
}));

import * as Sentry from '@sentry/react';
import { captureError, initMonitoring } from '../monitoringService';

describe('monitoringService', () => {
  it('initializes Sentry from env and captures errors after init', () => {
    expect(initMonitoring({})).toBe(false);

    expect(
      initMonitoring({
        VITE_SENTRY_DSN: 'https://public@example.ingest.sentry.io/1',
        MODE: 'test',
        VITE_SENTRY_TRACES_SAMPLE_RATE: '0.1',
      })
    ).toBe(true);

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://public@example.ingest.sentry.io/1',
        environment: 'test',
        tracesSampleRate: 0.1,
      })
    );
    expect(
      captureError(new Error('boom'), {
        tags: { where: 'test' },
        extra: { email: 'person@example.com' },
      })
    ).toBe('event-id');
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        extra: { email: '[REDACTED]' },
      })
    );
  });
});
