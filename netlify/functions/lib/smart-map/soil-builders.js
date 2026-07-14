const SOIL_FIELDS = [
  'id',
  'soil_series_name',
  'soil_series_code',
  'soil_group',
  'texture',
  'fertility',
  'ph_top',
  'district',
  'area_rai',
  'updated_at',
];

function geometryBounds(geometry) {
  const bounds = {
    minLon: Infinity,
    minLat: Infinity,
    maxLon: -Infinity,
    maxLat: -Infinity,
  };
  const visit = (coordinates) => {
    if (!Array.isArray(coordinates)) return;
    if (
      typeof coordinates[0] === 'number' &&
      typeof coordinates[1] === 'number'
    ) {
      bounds.minLon = Math.min(bounds.minLon, coordinates[0]);
      bounds.minLat = Math.min(bounds.minLat, coordinates[1]);
      bounds.maxLon = Math.max(bounds.maxLon, coordinates[0]);
      bounds.maxLat = Math.max(bounds.maxLat, coordinates[1]);
      return;
    }
    coordinates.forEach(visit);
  };
  visit(geometry?.coordinates);
  return Number.isFinite(bounds.minLon) ? bounds : null;
}

function intersectsBbox(geometry, bbox) {
  if (!bbox) return true;
  const bounds = geometryBounds(geometry);
  return Boolean(
    bounds &&
    bounds.minLon <= bbox.maxLon &&
    bounds.maxLon >= bbox.minLon &&
    bounds.minLat <= bbox.maxLat &&
    bounds.maxLat >= bbox.minLat
  );
}

export function toSoilFeatureCollection(rows, bbox) {
  let excludedGeometryCount = 0;
  const features = rows.flatMap((row) => {
    const geometry = row.geometry;
    if (
      !['Polygon', 'MultiPolygon'].includes(geometry?.type) ||
      !intersectsBbox(geometry, bbox)
    ) {
      excludedGeometryCount += 1;
      return [];
    }
    const properties = Object.fromEntries(
      SOIL_FIELDS.filter(
        (field) => row[field] !== undefined && field !== 'updated_at'
      ).map((field) => [field, row[field]])
    );
    return [{ type: 'Feature', geometry, properties }];
  });
  return {
    data: { type: 'FeatureCollection', features },
    meta: { count: features.length, excludedGeometryCount },
  };
}
