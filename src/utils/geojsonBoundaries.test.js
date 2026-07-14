import { describe, expect, test } from 'vitest';
import {
  compactSubdistrictProperties,
  countRowsBySubdistrict,
  filterSubdistrictGeojsonByProvince,
  findSubdistrictFeature,
  getSubdistrictsForDistrict,
  isFeatureInProvince,
  normalizePlaceName,
  normalizeProvinceCode,
} from './geojsonBoundaries';

describe('geojson boundary helpers', () => {
  test('normalizes province codes as two-character strings', () => {
    expect(normalizeProvinceCode(73)).toBe('73');
    expect(normalizeProvinceCode('7')).toBe('07');
    expect(normalizeProvinceCode(null)).toBe('');
  });

  test('normalizes Nakhon Pathom city district aliases consistently', () => {
    expect(normalizePlaceName('เมืองนครปฐม')).toBe('เมือง');
    expect(normalizePlaceName('อำเภอเมืองนครปฐม')).toBe('เมือง');
  });

  test('detects matching province code from GeoJSON feature properties', () => {
    expect(isFeatureInProvince({ properties: { pro_code: 73 } }, '73')).toBe(
      true
    );
    expect(isFeatureInProvince({ properties: { PRO_CODE: '73' } }, 73)).toBe(
      true
    );
    expect(isFeatureInProvince({ properties: { pro_code: '10' } }, '73')).toBe(
      false
    );
  });

  test('compacts subdistrict properties to the fields used by map layers', () => {
    expect(
      compactSubdistrictProperties({
        tam_code: '730101',
        tam_th: 'พระปฐมเจดีย์',
        amp_code: '7301',
        amp_th: 'เมืองนครปฐม',
        pro_code: 73,
        pro_th: 'นครปฐม',
        area_sqkm: 12.3,
        unused: 'drop me',
      })
    ).toEqual({
      tam_code: '730101',
      tam_th: 'พระปฐมเจดีย์',
      tam_en: '',
      amp_code: '7301',
      amp_th: 'เมืองนครปฐม',
      amp_en: '',
      pro_code: '73',
      pro_th: 'นครปฐม',
      pro_en: '',
      area_sqkm: 12.3,
    });
  });

  test('filters and compacts a FeatureCollection by province', () => {
    const result = filterSubdistrictGeojsonByProvince({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { tam_code: '730101', pro_code: '73', tam_th: 'A' },
          geometry: { type: 'Polygon', coordinates: [] },
        },
        {
          type: 'Feature',
          properties: { tam_code: '100101', pro_code: '10', tam_th: 'B' },
          geometry: { type: 'Polygon', coordinates: [] },
        },
      ],
    });

    expect(result.features).toHaveLength(1);
    expect(result.features[0].properties).toMatchObject({
      tam_code: '730101',
      pro_code: '73',
    });
  });

  test('returns subdistrict features for a district sorted by Thai name', () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            tam_code: '730102',
            tam_th: 'บางแขม',
            amp_th: 'เมืองนครปฐม',
          },
          geometry: null,
        },
        {
          type: 'Feature',
          properties: {
            tam_code: '730101',
            tam_th: 'พระปฐมเจดีย์',
            amp_th: 'เมืองนครปฐม',
          },
          geometry: null,
        },
        {
          type: 'Feature',
          properties: {
            tam_code: '730201',
            tam_th: 'กำแพงแสน',
            amp_th: 'กำแพงแสน',
          },
          geometry: null,
        },
      ],
    };

    expect(
      getSubdistrictsForDistrict(geojson, 'เมืองนครปฐม').map(
        (feature) => feature.properties.tam_code
      )
    ).toEqual(['730102', '730101']);
  });

  test('finds a subdistrict feature by code or Thai name', () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            tam_code: '730101',
            tam_th: 'พระปฐมเจดีย์',
            amp_th: 'เมืองนครปฐม',
          },
          geometry: null,
        },
      ],
    };

    expect(
      findSubdistrictFeature(geojson, { tamCode: '730101' })?.properties.tam_th
    ).toBe('พระปฐมเจดีย์');
    expect(
      findSubdistrictFeature(geojson, {
        districtName: 'เมืองนครปฐม',
        subdistrictName: 'พระปฐมเจดีย์',
      })?.properties.tam_code
    ).toBe('730101');
  });

  test('counts rows by subdistrict boundary code when names match', () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            tam_code: '730101',
            tam_th: 'พระปฐมเจดีย์',
            amp_th: 'เมืองนครปฐม',
          },
          geometry: null,
        },
      ],
    };
    const counts = countRowsBySubdistrict(
      [
        { district: 'เมืองนครปฐม', subdistrict: 'พระปฐมเจดีย์' },
        { district: 'เมืองนครปฐม', subdistrict: 'พระปฐมเจดีย์' },
        { district: 'เมืองนครปฐม', subdistrict: 'ไม่ตรง' },
      ],
      geojson
    );

    expect(counts).toEqual({ 730101: 2 });
  });
});
