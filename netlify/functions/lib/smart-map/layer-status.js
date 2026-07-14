export function summarizeLayerStatus(layer, stats = {}) {
  const rowCount = stats.totalRows || 0;
  const validCoordinateCount = stats.validCoordinateCount || 0;
  const coordinateReady =
    rowCount > 0 && validCoordinateCount / rowCount >= 0.8;
  return {
    id: layer.id,
    rowCount,
    validGeometryCount:
      layer.geometryType === 'point' ? validCoordinateCount : rowCount,
    invalidGeometryCount:
      (stats.invalidCoordinateCount || 0) + (stats.outsideProvinceCount || 0),
    updatedAt: stats.updatedAt || null,
    availability:
      rowCount === 0
        ? 'empty'
        : layer.geometryType === 'point' && !coordinateReady
          ? 'coordinate_incomplete'
          : layer.availability,
  };
}
