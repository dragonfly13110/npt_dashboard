import utm from 'utm';

const NAKHON_PATHOM_BOUNDS = {
  minLat: 13.45,
  maxLat: 14.35,
  minLon: 99.65,
  maxLon: 100.55,
};

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function classifyLatLng(latValue, lonValue) {
  const lat = numberOrNull(latValue);
  const lon = numberOrNull(lonValue);
  if (lat === null || lon === null) return 'missing';
  if (lat === 0 || lon === 0 || lat < 5 || lat > 21 || lon < 97 || lon > 106) {
    return 'invalid';
  }
  if (
    lat < NAKHON_PATHOM_BOUNDS.minLat ||
    lat > NAKHON_PATHOM_BOUNDS.maxLat ||
    lon < NAKHON_PATHOM_BOUNDS.minLon ||
    lon > NAKHON_PATHOM_BOUNDS.maxLon
  ) {
    return 'outside_province';
  }
  return 'valid';
}

export function classifyUtm47N(eastingValue, northingValue) {
  const easting = numberOrNull(eastingValue);
  const northing = numberOrNull(northingValue);
  if (easting === null || northing === null) return 'missing';
  try {
    const { latitude, longitude } = utm.toLatLon(
      easting,
      northing,
      47,
      undefined,
      true
    );
    return classifyLatLng(latitude, longitude);
  } catch {
    return 'invalid';
  }
}
