import { getSmartMapLayer } from '../../../../src/features/smart-map/config/layerCatalog.js';

export function getPointLayerPolicy(id) {
  const layer = getSmartMapLayer(id);
  if (
    !layer ||
    layer.geometryType !== 'point' ||
    layer.availability !== 'active'
  ) {
    return null;
  }
  return layer;
}
