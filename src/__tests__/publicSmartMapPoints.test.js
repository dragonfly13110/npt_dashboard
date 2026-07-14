import { describe, expect, test } from 'vitest';
import { getPointLayerPolicy } from '../../netlify/functions/lib/smart-map/layer-policy';
import { toPointFeatureCollection } from '../../netlify/functions/lib/smart-map/feature-builders';
import { summarizeLayerStatus } from '../../netlify/functions/lib/smart-map/layer-status';
import handler from '../../netlify/functions/public-smart-map-points';

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
