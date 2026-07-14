import { useQuery } from '@tanstack/react-query';
import {
  fetchSmartMapLayerStatus,
  fetchSmartMapPoints,
  fetchSmartMapSoil,
  fetchSmartMapSummary,
  fetchSmartMapWeather,
  smartMapQueryKeys,
} from '../services/smartMapApi';

const QUERY_OPTIONS = { staleTime: 2 * 60 * 1000, refetchOnWindowFocus: false };

export function useSmartMapSummary(scope) {
  return useQuery({
    queryKey: smartMapQueryKeys.summary(scope),
    queryFn: ({ signal }) => fetchSmartMapSummary(scope, { signal }),
    ...QUERY_OPTIONS,
  });
}

export function useSmartMapLayerStatus() {
  return useQuery({
    queryKey: smartMapQueryKeys.layerStatus(),
    queryFn: ({ signal }) => fetchSmartMapLayerStatus({ signal }),
    ...QUERY_OPTIONS,
  });
}

export function useSmartMapWeather() {
  return useQuery({
    queryKey: smartMapQueryKeys.weather(),
    queryFn: ({ signal }) => fetchSmartMapWeather({ signal }),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useSmartMapPoints(layer, { enabled = false, bbox } = {}) {
  return useQuery({
    queryKey: smartMapQueryKeys.points(layer, bbox),
    queryFn: ({ signal }) => fetchSmartMapPoints(layer, { bbox, signal }),
    enabled,
    ...QUERY_OPTIONS,
  });
}

export function useSmartMapSoil({ enabled = false, bbox } = {}) {
  return useQuery({
    queryKey: smartMapQueryKeys.soil(bbox),
    queryFn: ({ signal }) => fetchSmartMapSoil({ bbox, signal }),
    enabled,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
