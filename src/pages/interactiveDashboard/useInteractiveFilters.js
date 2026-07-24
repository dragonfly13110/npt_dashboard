import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DISTRICT_LIST } from '../../hooks/useDashboardData';
import { useApiCache } from '../../hooks/useApiCache';
import { supabase } from '../../supabaseClient';
import {
  ALL_DISTRICTS,
  LATEST_YEAR,
  collectYears,
  normalizeYear,
} from './filters';

export function useInteractiveFilters() {
  const [params, setParams] = useSearchParams();
  const requestedDistrict = params.get('district');
  const district = DISTRICT_LIST.includes(requestedDistrict)
    ? requestedDistrict
    : ALL_DISTRICTS;
  const year = normalizeYear(params.get('year') || LATEST_YEAR);

  const update = useCallback(
    (key, value, defaultValue) => {
      setParams((current) => {
        const next = new URLSearchParams(current);
        if (value === defaultValue) next.delete(key);
        else next.set(key, value);
        return next;
      });
    },
    [setParams]
  );

  return {
    district,
    year,
    districts: [ALL_DISTRICTS, ...DISTRICT_LIST],
    setDistrict: (value) => update('district', value, ALL_DISTRICTS),
    setYear: (value) => update('year', normalizeYear(value), LATEST_YEAR),
  };
}

export function useInteractiveYears() {
  const query = useApiCache('interactive-dashboard-years', async () => {
    const results = await Promise.all([
      supabase.from('farmer_registry').select('data_year'),
      supabase.from('tbk_cultivation_snapshots').select('data_year'),
      supabase.from('large_plots').select('year'),
      supabase.from('crop_production').select('year'),
      supabase.from('production_costs').select('data_year'),
      supabase.from('disasters').select('year'),
    ]);
    return collectYears([
      { rows: results[0].data || [], yearKey: 'data_year' },
      { rows: results[1].data || [], yearKey: 'data_year' },
      { rows: results[2].data || [], yearKey: 'year' },
      { rows: results[3].data || [], yearKey: 'year' },
      { rows: results[4].data || [], yearKey: 'data_year' },
      { rows: results[5].data || [], yearKey: 'year' },
    ]);
  });
  return { years: query.data || [], loading: query.isLoading };
}
