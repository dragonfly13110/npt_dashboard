import utm from 'utm';
import { classifyLatLng } from '../../../../src/features/smart-map/utils/coordinateValidation.js';

function coordinatesFor(policy, row) {
  if (policy.coordinateType === 'utm_47n') {
    try {
      const { latitude, longitude } = utm.toLatLon(
        Number(row[policy.latitudeField]),
        Number(row[policy.longitudeField]),
        47,
        undefined,
        true
      );
      return {
        state: classifyLatLng(latitude, longitude),
        latitude,
        longitude,
      };
    } catch {
      return { state: 'invalid' };
    }
  }
  const latitude = row[policy.latitudeField];
  const longitude = row[policy.longitudeField];
  return { state: classifyLatLng(latitude, longitude), latitude, longitude };
}

function inBbox(latitude, longitude, bbox) {
  return (
    !bbox ||
    (longitude >= bbox.minLon &&
      longitude <= bbox.maxLon &&
      latitude >= bbox.minLat &&
      latitude <= bbox.maxLat)
  );
}

export function toPointFeatureCollection(policy, rows = [], bbox) {
  const meta = {
    layerId: policy.id,
    count: 0,
    validCoordinateCount: 0,
    invalidCoordinateCount: 0,
    outsideProvinceCount: 0,
    truncated: false,
  };
  const features = [];

  for (const row of rows) {
    const { state, latitude, longitude } = coordinatesFor(policy, row);
    if (state === 'invalid' || state === 'missing') {
      meta.invalidCoordinateCount += 1;
      continue;
    }
    if (state === 'outside_province') {
      meta.outsideProvinceCount += 1;
      continue;
    }
    meta.validCoordinateCount += 1;
    if (!inBbox(latitude, longitude, bbox)) continue;
    features.push({
      type: 'Feature',
      id: row.id,
      geometry: {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      },
      properties: Object.fromEntries(
        policy.publicFields.map((field) => [field, row[field] ?? null])
      ),
    });
  }
  meta.count = features.length;
  return { data: { type: 'FeatureCollection', features }, meta };
}
