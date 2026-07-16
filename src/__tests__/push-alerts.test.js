import { describe, expect, it, vi } from 'vitest';
import {
  collectAlertEvents,
  deliverAlerts,
} from '../../netlify/functions/push-alerts.js';

describe('scheduled push alerts', () => {
  it('normalizes outbreak and hotspot rows into stable events', () => {
    const events = collectAlertEvents({
      outbreaks: [
        {
          id: 'p1',
          pest_name: 'เพลี้ย',
          affected_crop: 'ข้าว',
          district: 'กำแพงแสน',
          report_date: '2026-07-16',
        },
      ],
      hotspots: [
        {
          id: 'h1',
          spot_name: 'VIIRS',
          district: 'กำแพงแสน',
          acq_date: '2026-07-16',
          acq_time: '0830',
        },
      ],
    });
    expect(events).toEqual([
      expect.objectContaining({
        eventKey: 'outbreak:p1',
        type: 'outbreak',
        district: 'กำแพงแสน',
      }),
      expect.objectContaining({
        eventKey: 'hotspot:h1',
        type: 'hotspot',
        district: 'กำแพงแสน',
      }),
    ]);
  });

  it('sends only matching new events and removes expired endpoints', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce({ statusCode: 410 });
    const remove = vi.fn();
    const markSent = vi.fn();
    const subscriptions = [
      {
        endpoint: 'one',
        subscription: { endpoint: 'one' },
        outbreak: true,
        hotspot: false,
        districts: ['กำแพงแสน'],
      },
      {
        endpoint: 'gone',
        subscription: { endpoint: 'gone' },
        outbreak: true,
        hotspot: false,
        districts: [],
      },
    ];
    const events = [
      {
        eventKey: 'outbreak:p1',
        type: 'outbreak',
        district: 'กำแพงแสน',
        title: 'เตือนการระบาด',
        body: 'พบเพลี้ย',
        url: '/dashboard/protection/pest-outbreaks',
      },
      {
        eventKey: 'hotspot:h1',
        type: 'hotspot',
        district: 'กำแพงแสน',
      },
    ];

    const result = await deliverAlerts({
      subscriptions,
      events,
      sentKeys: new Set(),
      send,
      remove,
      markSent,
    });

    expect(result).toEqual({ sent: 1, expired: 1 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledWith('gone');
    expect(markSent).toHaveBeenCalledWith(events[0]);
  });
});
