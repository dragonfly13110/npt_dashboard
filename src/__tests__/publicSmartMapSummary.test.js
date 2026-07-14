import { describe, expect, test } from 'vitest';
import {
  buildSmartMapSummary,
  parseSummaryScope,
} from '../../netlify/functions/lib/smart-map/summary-builders';
import handler from '../../netlify/functions/public-smart-map-summary';

describe('buildSmartMapSummary', () => {
  test('returns metrics from the selected district only', () => {
    const summary = buildSmartMapSummary(
      { level: 'district', districtName: 'เมืองนครปฐม' },
      {
        agriculturalAreas: [
          {
            district: 'เมืองนครปฐม',
            total_area_rai: 100,
            farmer_households: 10,
            created_at: '2026-07-14T00:00:00Z',
          },
          { district: 'สามพราน', total_area_rai: 999, farmer_households: 99 },
        ],
        communityEnterprises: [{ district: 'เมืองนครปฐม' }],
        largePlots: [{ district: 'เมืองนครปฐม' }, { district: 'สามพราน' }],
        smartFarmers: [{ district: 'เมืองนครปฐม' }],
        youngSmartFarmers: [{ district: 'เมืองนครปฐม' }],
        fireHotspots: [{ district: 'เมืองนครปฐม' }],
      }
    );

    expect(summary.availability).toBe('active');
    expect(summary.metrics).toMatchObject({
      farmAreaRai: 100,
      farmerHouseholds: 10,
      communityEnterprises: 1,
      largePlots: 1,
      smartFarmers: 1,
      youngSmartFarmers: 1,
      hotspotCount: 1,
    });
    expect(summary.updatedAt).toBe('2026-07-14T00:00:00Z');
    expect(summary.sources).toContainEqual({
      table: 'agricultural_areas',
      updatedAt: '2026-07-14T00:00:00Z',
    });
  });

  test('does not silently use district values for a subdistrict without data', () => {
    const summary = buildSmartMapSummary(
      {
        level: 'subdistrict',
        districtName: 'เมืองนครปฐม',
        subdistrictName: 'พระปฐมเจดีย์',
      },
      {
        farmerRegistry: [
          {
            district: 'เมืองนครปฐม',
            subdistrict: 'นครปฐม',
            farm_area_rai: 500,
            net_total_households: 50,
          },
        ],
        agriculturalAreas: [
          {
            district: 'เมืองนครปฐม',
            total_area_rai: 999,
            farmer_households: 99,
          },
        ],
      }
    );

    expect(summary.availability).toBe('district_only');
    expect(summary.metrics.farmAreaRai).toBe(0);
    expect(summary.metrics.farmerHouseholds).toBe(0);
  });

  test('returns metric-ready district breakdowns including registry, GEOPLOTS, groups, and hotspots', () => {
    const summary = buildSmartMapSummary(
      { level: 'province' },
      {
        agriculturalAreas: [
          { district: 'Mueang', total_area_rai: 10, farmer_households: 2 },
        ],
        farmerRegistry: [
          {
            district: 'Mueang',
            subdistrict: 'Phra Pathom',
            net_total_households: 3,
          },
        ],
        geoplotsDistrict: [
          { district: 'Mueang', drawn_plots: 6, target_plots: 10 },
        ],
        youngFarmerGroups: [{ district: 'Mueang' }],
        careerGroups: [{ district: 'Mueang' }],
        fireHotspots: [{ district: 'Mueang' }],
      }
    );

    expect(summary.breakdown).toEqual([
      expect.objectContaining({
        districtName: 'Mueang',
        metrics: expect.objectContaining({
          farmerRegistryHouseholds: 3,
          geoplotProgressPercent: 60,
          groupCount: 2,
          hotspotCount: 1,
        }),
      }),
    ]);
  });
});

test('parseSummaryScope requires the name needed for the requested level', () => {
  expect(
    parseSummaryScope(
      new URLSearchParams({
        level: 'subdistrict',
        districtName: 'เมืองนครปฐม',
        subdistrictName: 'พระปฐมเจดีย์',
      })
    )
  ).toMatchObject({
    level: 'subdistrict',
    districtName: 'เมืองนครปฐม',
    subdistrictName: 'พระปฐมเจดีย์',
  });
  expect(() =>
    parseSummaryScope(new URLSearchParams({ level: 'district' }))
  ).toThrow('districtName is required');
});

test('summary endpoint rejects incomplete scopes before querying data', async () => {
  const response = await handler(
    new Request(
      'https://example.test/api/public-smart-map-summary?level=district'
    )
  );

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({
    error: 'districtName is required',
  });
});
