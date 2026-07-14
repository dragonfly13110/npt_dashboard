import { describe, expect, test } from 'vitest';
import { toSoilFeatureCollection } from '../../netlify/functions/lib/smart-map/soil-builders';
import { mergeDistrictWeather } from '../../netlify/functions/lib/smart-map/weather-builders';
import { getWeatherPayload } from '../../netlify/functions/public-smart-map-weather';

describe('smart map soil response', () => {
  test('returns allowlisted GeoJSON polygons intersecting the requested bbox', () => {
    const collection = toSoilFeatureCollection(
      [
        {
          id: 1,
          soil_series_name: 'Safe soil',
          soil_group: '33',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [100, 13],
                [101, 13],
                [101, 14],
                [100, 13],
              ],
            ],
          },
          raw_properties: { private: true },
        },
        {
          id: 2,
          geometry: { type: 'Point', coordinates: [99, 12] },
        },
      ],
      { minLon: 99.9, minLat: 12.9, maxLon: 100.1, maxLat: 13.1 }
    );

    expect(collection.data.features).toHaveLength(1);
    expect(collection.data.features[0].properties).not.toHaveProperty(
      'raw_properties'
    );
    expect(collection.meta.excludedGeometryCount).toBe(1);
  });
});

describe('smart map weather response', () => {
  test('keeps air quality when weather is unavailable', () => {
    const response = mergeDistrictWeather(
      [{ district: 'เมืองนครปฐม', lat: 13.82, lon: 100.04 }],
      null,
      [{ current: { pm2_5: 18, european_aqi: 21, time: '2026-07-14T10:00' } }]
    );

    expect(response.meta.status).toBe('partial');
    expect(response.data[0]).toMatchObject({
      district: 'เมืองนครปฐม',
      pm25: 18,
      weatherStatus: 'unavailable',
      airQualityStatus: 'ok',
    });
  });

  test('returns an explicit unavailable status when both upstream APIs fail', async () => {
    const payload = await getWeatherPayload(async () => {
      throw new Error('upstream unavailable');
    }, 0);

    expect(payload.meta.status).toBe('unavailable');
    expect(payload.data).toHaveLength(7);
    expect(payload.data[0].weatherStatus).toBe('unavailable');
  });
});
