import { describe, expect, it } from 'vitest';
import {
  eventKey,
  matchesPreference,
  urlBase64ToUint8Array,
} from '../pushNotifications';

describe('push notification helpers', () => {
  it('creates the same stable key for the same event', () => {
    const event = {
      type: 'hotspot',
      sourceId: '13.75,100.12,2026-07-16,0830',
      district: 'เมืองนครปฐม',
    };
    expect(eventKey(event)).toBe(eventKey({ ...event }));
  });

  it('matches enabled alert type and district', () => {
    const preference = {
      outbreak: true,
      hotspot: false,
      districts: ['เมืองนครปฐม'],
    };
    expect(
      matchesPreference(preference, {
        type: 'outbreak',
        district: 'เมืองนครปฐม',
      })
    ).toBe(true);
    expect(
      matchesPreference(preference, {
        type: 'hotspot',
        district: 'เมืองนครปฐม',
      })
    ).toBe(false);
  });

  it('treats an empty district list as all districts', () => {
    expect(
      matchesPreference(
        { outbreak: false, hotspot: true, districts: [] },
        { type: 'hotspot', district: 'กำแพงแสน' }
      )
    ).toBe(true);
  });

  it('converts a VAPID public key for PushManager', () => {
    expect(urlBase64ToUint8Array('AQID')).toEqual(new Uint8Array([1, 2, 3]));
  });
});
