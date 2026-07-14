import { describe, expect, it, vi } from 'vitest';
import {
  fetchSmartMapPoints,
  fetchSmartMapSummary,
  smartMapQueryKeys,
} from '../services/smartMapApi';

describe('smartMapApi', () => {
  it('uses scope in a stable summary key and request URL', async () => {
    const signal = new AbortController().signal;
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ metrics: {} }),
    });
    const scope = { level: 'district', districtName: 'เมืองนครปฐม' };

    await fetchSmartMapSummary(scope, { signal, fetcher });

    expect(smartMapQueryKeys.summary(scope)).toEqual([
      'smart-map',
      'summary',
      'district',
      'เมืองนครปฐม',
      null,
    ]);
    expect(fetcher.mock.calls[0][0]).toContain(
      'level=district&districtName=%E0%B9%80%E0%B8%A1%E0%B8%B7%E0%B8%AD%E0%B8%87%E0%B8%99%E0%B8%84%E0%B8%A3%E0%B8%9B%E0%B8%90%E0%B8%A1'
    );
    expect(fetcher.mock.calls[0][1].signal).toBe(signal);
  });

  it('uses layer and bbox in point requests', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { features: [] } }),
    });

    await fetchSmartMapPoints('fire_hotspots', {
      bbox: [100, 13, 101, 14],
      fetcher,
    });

    expect(
      smartMapQueryKeys.points('fire_hotspots', [100, 13, 101, 14])
    ).toEqual(['smart-map', 'points', 'fire_hotspots', '100,13,101,14']);
    expect(fetcher.mock.calls[0][0]).toContain(
      'layer=fire_hotspots&bbox=100%2C13%2C101%2C14'
    );
  });
});
