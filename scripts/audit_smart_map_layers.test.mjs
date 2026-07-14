import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyLatLng, classifyUtm47N } from './audit_smart_map_layers.mjs';

test('classifyLatLng accepts a coordinate inside Nakhon Pathom', () => {
  assert.equal(classifyLatLng(13.82, 100.04), 'valid');
});

test('classifyLatLng rejects zero and coordinates outside the province', () => {
  assert.equal(classifyLatLng(0, 0), 'invalid');
  assert.equal(classifyLatLng(13.82, 101.04), 'outside_province');
});

test('classifyUtm47N rejects incomplete and implausible UTM coordinates', () => {
  assert.equal(classifyUtm47N(null, 1520000), 'missing');
  assert.equal(classifyUtm47N(100, 100), 'invalid');
});
