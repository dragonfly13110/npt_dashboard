import { describe, expect, test, vi } from 'vitest';
import { getPointLayerPolicy } from '../../netlify/functions/lib/smart-map/layer-policy';
import { toPointFeatureCollection } from '../../netlify/functions/lib/smart-map/feature-builders';
import { summarizeLayerStatus } from '../../netlify/functions/lib/smart-map/layer-status';
import { summarizeSpatialQuality } from '../../netlify/functions/lib/smart-map/feature-builders';
import handler from '../../netlify/functions/public-smart-map-points';

const pointQuery = {
  select: vi.fn(),
  limit: vi.fn(),
};
const pointSupabase = { from: vi.fn(() => pointQuery) };

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => pointSupabase),
}));

describe('public smart map point policy', () => {
  test('allows only catalogued public point layers', () => {
    expect(getPointLayerPolicy('forecast_plots')).toMatchObject({
      sourceTable: 'forecast_plots',
      coordinateType: 'utm_47n',
    });
    expect(getPointLayerPolicy('smart_farmer_sf')).toBe(null);
  });
});

test('toPointFeatureCollection excludes invalid coordinates and non-allowlisted fields', () => {
  const collection = toPointFeatureCollection(
    {
      id: 'fire_hotspots',
      coordinateType: 'lat_lon',
      latitudeField: 'latitude',
      longitudeField: 'longitude',
      publicFields: ['id', 'district', 'latitude', 'longitude'],
    },
    [
      {
        id: 'safe',
        district: 'เมือง',
        latitude: 13.82,
        longitude: 100.04,
        owner_name: 'private',
      },
      { id: 'bad', district: 'เมือง', latitude: 0, longitude: 0 },
    ]
  );

  expect(collection.data.features).toHaveLength(1);
  expect(collection.data.features[0].properties).not.toHaveProperty(
    'owner_name'
  );
  expect(collection.meta.invalidCoordinateCount).toBe(1);
});

test('point endpoint rejects an unknown layer before querying data', async () => {
  const response = await handler(
    new Request(
      'https://example.test/api/public-smart-map-points?layer=smart_farmer_sf'
    )
  );

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({
    error: 'Unknown point layer',
  });
});

test('point endpoint never returns private row fields', async () => {
  const previousUrl = process.env.VITE_SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.VITE_SUPABASE_URL = 'https://example.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  pointQuery.select.mockReturnValue(pointQuery);
  pointQuery.limit.mockResolvedValue({
    data: [
      {
        id: 'plot-1',
        district: 'เมืองนครปฐม',
        subdistrict: 'พระปฐมเจดีย์',
        crop_type: 'ข้าว',
        coord_x: 617356,
        coord_y: 1522123,
        owner_name: 'private person',
      },
    ],
    count: 1,
    error: null,
  });

  const response = await handler(
    new Request(
      'https://example.test/api/public-smart-map-points?layer=forecast_plots'
    )
  );
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(pointQuery.select).toHaveBeenCalledWith(
    expect.not.stringContaining('owner_name'),
    { count: 'exact' }
  );
  expect(JSON.stringify(payload)).not.toContain('private person');
  expect(payload.data.features[0].properties).not.toHaveProperty('owner_name');

  process.env.VITE_SUPABASE_URL = previousUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
});

test('summarizeLayerStatus marks sparse coordinates as incomplete', () => {
  expect(
    summarizeLayerStatus(
      { id: 'agri_tourism', geometryType: 'point', availability: 'active' },
      {
        totalRows: 23,
        validCoordinateCount: 5,
        invalidCoordinateCount: 0,
        outsideProvinceCount: 0,
      }
    )
  ).toMatchObject({ availability: 'coordinate_incomplete', rowCount: 23 });
});

test('summarizeSpatialQuality reports invalid, outside, and duplicate coordinates', () => {
  expect(
    summarizeSpatialQuality(
      {
        id: 'fire_hotspots',
        coordinateType: 'lat_lon',
        latitudeField: 'latitude',
        longitudeField: 'longitude',
      },
      [
        { id: 'valid-a', latitude: 13.82, longitude: 100.04 },
        { id: 'valid-b', latitude: 13.82, longitude: 100.04 },
        { id: 'outside', latitude: 13.82, longitude: 101.04 },
        { id: 'invalid', latitude: 0, longitude: 0 },
      ]
    )
  ).toMatchObject({
    totalRows: 4,
    validCoordinateCount: 2,
    outsideProvinceCount: 1,
    invalidCoordinateCount: 1,
    duplicateCoordinateCount: 1,
    invalidExamples: [
      { id: 'outside', state: 'outside_province' },
      { id: 'invalid', state: 'invalid' },
    ],
  });
});
