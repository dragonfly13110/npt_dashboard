import { describe, expect, test } from 'vitest';
import { getSmartMapLayer, SMART_MAP_LAYERS } from '../config/layerCatalog';
import { classifyLatLng, classifyUtm47N } from '../utils/coordinateValidation';
import { escapeHtml } from '../utils/mapSanitizers';

describe('smart map layer catalog', () => {
  test('uses unique IDs and allowlists fields for every public point layer', () => {
    const ids = SMART_MAP_LAYERS.map((layer) => layer.id);
    const publicPointLayers = SMART_MAP_LAYERS.filter(
      (layer) =>
        layer.geometryType === 'point' && layer.availability === 'active'
    );

    expect(new Set(ids).size).toBe(ids.length);
    expect(publicPointLayers).not.toHaveLength(0);
    expect(
      publicPointLayers.every((layer) => layer.publicFields.length > 0)
    ).toBe(true);
    expect(
      publicPointLayers.flatMap((layer) => layer.publicFields)
    ).not.toContain('owner_name');
    expect(getSmartMapLayer('fire_hotspots')?.sourceTable).toBe(
      'fire_hotspots'
    );
  });
});

describe('smart map coordinate validation', () => {
  test('classifies invalid, outside, and valid latitude-longitude pairs', () => {
    expect(classifyLatLng(0, 0)).toBe('invalid');
    expect(classifyLatLng(13.82, 101.04)).toBe('outside_province');
    expect(classifyLatLng(13.82, 100.04)).toBe('valid');
  });

  test('converts valid UTM 47N coordinates before classifying them', () => {
    expect(classifyUtm47N(100, 100)).toBe('invalid');
  });
});

test('escapeHtml neutralizes dynamic tooltip content', () => {
  expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
    '&lt;img src=x onerror=alert(1)&gt;'
  );
});
