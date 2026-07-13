import { useQuery } from '@tanstack/react-query';
import {
  getWeatherSummary,
  getAirQualitySummary,
  getHotspotSummary,
  getDiseaseForecastSummary,
  getSoilMoistureSummary,
  getReservoirSummary,
  getAgriPriceSummary,
  getOilPriceSummary,
  getProvinceOverviewSummary,
} from '../../services/landing/landingSummaryService';

export function useWeatherSummary() {
  return useQuery({
    queryKey: ['landing-summary', 'weather', 'nakhon-pathom'],
    queryFn: getWeatherSummary,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 60 minutes
    retry: 1,
  });
}

export function useAirQualitySummary() {
  return useQuery({
    queryKey: ['landing-summary', 'air-quality', 'nakhon-pathom'],
    queryFn: getAirQualitySummary,
    staleTime: 20 * 60 * 1000, // 20 minutes
    gcTime: 40 * 60 * 1000,
    retry: 1,
  });
}

export function useHotspotSummary() {
  return useQuery({
    queryKey: ['landing-summary', 'hotspots', '24h'],
    queryFn: getHotspotSummary,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export function useDiseaseForecastSummary() {
  return useQuery({
    queryKey: ['landing-summary', 'disease-forecast'],
    queryFn: getDiseaseForecastSummary,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 120 * 60 * 1000,
    retry: 1,
  });
}

export function useSoilMoistureSummary() {
  return useQuery({
    queryKey: ['landing-summary', 'soil-moisture', 'nakhon-pathom'],
    queryFn: getSoilMoistureSummary,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export function useReservoirSummary() {
  return useQuery({
    queryKey: ['landing-summary', 'reservoir'],
    queryFn: getReservoirSummary,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 120 * 60 * 1000,
    retry: 1,
  });
}

export function useAgriPriceSummary() {
  return useQuery({
    queryKey: ['landing-summary', 'market', 'agri-rice'],
    queryFn: getAgriPriceSummary,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 120 * 60 * 1000,
    retry: 1,
  });
}

export function useOilPriceSummary() {
  return useQuery({
    queryKey: ['landing-summary', 'market', 'oil'],
    queryFn: getOilPriceSummary,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export function useProvinceOverviewSummary() {
  return useQuery({
    queryKey: ['landing-summary', 'province-stats'],
    queryFn: getProvinceOverviewSummary,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
    gcTime: 12 * 60 * 60 * 1000,
    retry: 1,
  });
}
