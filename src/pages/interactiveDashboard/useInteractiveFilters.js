import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DISTRICT_LIST } from '../../hooks/dashboard/config';
import { useApiCache } from '../../hooks/useApiCache';
import { supabase } from '../../supabaseClient';
import {
  ALL_DISTRICTS,
  LATEST_YEAR,
  collectYears,
  cropYears,
  normalizeYear,
} from './filters';

const YEAR_SOURCES = [
  { table: 'farmer_registry', yearKey: 'data_year' },
  { table: 'tbk_cultivation_snapshots', yearKey: 'data_year' },
  { table: 'large_plots', yearKey: 'year' },
  { table: 'crop_production', yearKey: 'year' },
  { table: 'production_costs', yearKey: 'data_year' },
  { table: 'disasters', yearKey: 'year' },
  { table: 'smart_farmer_sf', yearKey: 'data_year' },
  { table: 'young_smart_farmer_ysf', yearKey: 'data_year' },
  { table: 'agricultural_career_groups', yearKey: 'data_year' },
  { table: 'housewife_farmer_groups', yearKey: 'year' },
  { table: 'young_farmer_groups_detailed', yearKey: 'data_year' },
  {
    table: 'rice_harvest_snapshots',
    yearKey: 'crop_year',
    parseYear: cropYears,
  },
];

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
    const results = await Promise.allSettled(
      YEAR_SOURCES.map(({ table, yearKey }) =>
        supabase.from(table).select(yearKey)
      )
    );
    return collectYears(
      YEAR_SOURCES.map(({ yearKey, parseYear }, index) => ({
        rows:
          results[index].status === 'fulfilled'
            ? results[index].value.data || []
            : [],
        yearKey,
        parseYear,
      }))
    ).filter((year) => normalizeYear(year) !== LATEST_YEAR);
  });
  return { years: query.data || [], loading: query.isLoading };
}
