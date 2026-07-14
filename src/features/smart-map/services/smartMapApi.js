const API_ROOT = '/api';

function params(values) {
  return new URLSearchParams(
    Object.entries(values).filter(
      ([, value]) => value !== null && value !== undefined && value !== ''
    )
  ).toString();
}

async function get(path, { signal, fetcher = fetch } = {}) {
  const response = await fetcher(`${API_ROOT}${path}`, { signal });
  const payload = await response.json();
  if (!response.ok)
    throw new Error(payload.error || `Request failed: ${response.status}`);
  return payload;
}

function scopeValues(scope = {}) {
  return {
    level: scope.level || 'province',
    districtName: scope.districtName,
    subdistrictName: scope.subdistrictName,
  };
}

function bboxKey(bbox) {
  return bbox?.join(',') || null;
}

export const smartMapQueryKeys = {
  summary: (scope = {}) => [
    'smart-map',
    'summary',
    scope.level || 'province',
    scope.districtName || null,
    scope.subdistrictName || null,
  ],
  layerStatus: () => ['smart-map', 'layer-status'],
  weather: () => ['smart-map', 'weather'],
  points: (layer, bbox) => ['smart-map', 'points', layer, bboxKey(bbox)],
  soil: (bbox) => ['smart-map', 'soil', bboxKey(bbox)],
};

export function fetchSmartMapSummary(scope, options) {
  return get(
    `/public-smart-map-summary?${params(scopeValues(scope))}`,
    options
  );
}

export function fetchSmartMapLayerStatus(options) {
  return get('/public-smart-map-layer-status', options);
}

export function fetchSmartMapWeather(options) {
  return get('/public-smart-map-weather', options);
}

export function fetchSmartMapPoints(layer, { bbox, signal, fetcher } = {}) {
  return get(
    `/public-smart-map-points?${params({ layer, bbox: bboxKey(bbox) })}`,
    { signal, fetcher }
  );
}

export function fetchSmartMapSoil({ bbox, signal, fetcher } = {}) {
  return get(`/public-smart-map-soil?${params({ bbox: bboxKey(bbox) })}`, {
    signal,
    fetcher,
  });
}
