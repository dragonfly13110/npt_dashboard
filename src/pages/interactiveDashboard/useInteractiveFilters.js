import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DISTRICT_LIST } from '../../hooks/dashboard/config';
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
    setDistrict: (value) =>
      update(
        'district',
        DISTRICT_LIST.includes(value) ? value : ALL_DISTRICTS,
        ALL_DISTRICTS
      ),
    setYear: (value) => update('year', normalizeYear(value), LATEST_YEAR),
  };
}

export function useInteractiveYears() {
  const query = useApiCache('interactive-dashboard-years', async () => {
    const results = await Promise.allSettled([
      supabase.from('farmer_registry').select('data_year'),
      supabase.from('tbk_cultivation_snapshots').select('data_year'),
      supabase.from('large_plots').select('year'),
      supabase.from('crop_production').select('year'),
      supabase.from('production_costs').select('data_year'),
      supabase.from('disasters').select('year'),
    ]);
    const rows = results.map((result) =>
      result.status === 'fulfilled' ? result.value.data || [] : []
    );
    return collectYears([
      { rows: rows[0], yearKey: 'data_year' },
      { rows: rows[1], yearKey: 'data_year' },
      { rows: rows[2], yearKey: 'year' },
      { rows: rows[3], yearKey: 'year' },
      { rows: rows[4], yearKey: 'data_year' },
      { rows: rows[5], yearKey: 'year' },
    ]).filter((year) => normalizeYear(year) !== LATEST_YEAR);
  });
  return { years: query.data || [], loading: query.isLoading };
}
