import { describe, expect, it, vi } from 'vitest';
import {
  alertUnhealthySystem,
  checkSystemHealth,
} from '../../netlify/functions/lib/system-health.js';

describe('system health', () => {
  it('reports healthy when database and datasets are fresh', async () => {
    const report = await checkSystemHealth({
      now: new Date('2026-07-24T00:00:00.000Z'),
      ping: vi.fn().mockResolvedValue(undefined),
      readLatest: vi.fn().mockResolvedValue('2026-07-23T23:00:00.000Z'),
      rules: [
        {
          id: 'weather',
          table: 'daily_weather',
          field: 'date',
          maxAgeHours: 48,
        },
      ],
    });

    expect(report.status).toBe('healthy');
    expect(report.database.status).toBe('healthy');
    expect(report.datasets[0]).toMatchObject({
      id: 'weather',
      status: 'healthy',
      ageHours: 1,
    });
  });

  it('reports degraded when a dataset exceeds its freshness SLA', async () => {
    const report = await checkSystemHealth({
      now: new Date('2026-07-24T00:00:00.000Z'),
      ping: vi.fn().mockResolvedValue(undefined),
      readLatest: vi.fn().mockResolvedValue('2026-07-21T00:00:00.000Z'),
      rules: [
        {
          id: 'weather',
          table: 'daily_weather',
          field: 'date',
          maxAgeHours: 48,
        },
      ],
    });

    expect(report.status).toBe('degraded');
    expect(report.datasets[0]).toMatchObject({
      status: 'stale',
      ageHours: 72,
      maxAgeHours: 48,
    });
  });

  it('alerts once with unhealthy dataset IDs', async () => {
    const alert = vi.fn().mockResolvedValue(true);

    const alerted = await alertUnhealthySystem(
      {
        status: 'degraded',
        datasets: [
          { id: 'weather', status: 'stale' },
          { id: 'rice-harvest', status: 'healthy' },
          { id: 'tbk-cultivation', status: 'missing' },
        ],
      },
      { alert, requestId: 'scheduled-1' }
    );

    expect(alerted).toBe(true);
    expect(alert).toHaveBeenCalledWith({
      functionName: 'system-health-monitor',
      event: 'stale_weather,tbk-cultivation',
      requestId: 'scheduled-1',
    });
  });
});
