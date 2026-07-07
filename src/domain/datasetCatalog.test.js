import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  canDistrictEditorWriteTable,
  canGroupAccessTable,
  canGuestAccessGroup,
  canGuestAccessTable,
  getDatasetRoute,
  getDatasetSelectColumns,
  getDepartmentGroupKey,
  getGroupTables,
  getSearchColumns,
  listDatasetKeys,
} from './datasetCatalog';

function readGlobalSearchSql() {
  return readFileSync('supabase/global_search.sql', 'utf8');
}

function getRpcConfigTables(sql) {
  return [...sql.matchAll(/\('([^']+)'::text,\s*ARRAY\[/g)].map(
    (match) => match[1]
  );
}

function getLegacyWrapperTables(sql) {
  const wrapperSql = sql.slice(
    sql.indexOf('CREATE OR REPLACE FUNCTION public.global_search(')
  );
  const arrays = [...wrapperSql.matchAll(/ARRAY\[\s*([\s\S]*?)\s*\]/g)];
  return [...(arrays[1]?.[1] || '').matchAll(/'([^']+)'/g)].map(
    (match) => match[1]
  );
}

describe('datasetCatalog', () => {
  it('keeps table routes and search metadata in one place', () => {
    expect(getDatasetRoute('large_plots')).toBe(
      '/dashboard/production/large-plots'
    );
    expect(getSearchColumns('large_plots')).toContain('plot_name');
    expect(getDatasetRoute('assets')).toBe('/dashboard/admin/assets');
    expect(getSearchColumns('assets')).toContain('name');
    expect(getSearchColumns('ai_disease_forecasts')).toContain('target_crop');
  });

  it('keeps RPC global search aligned with app search metadata', () => {
    const sql = readGlobalSearchSql();

    expect(sql).toContain("'soil_series'::text");
    expect(sql).toContain("'assets'::text");
    expect(sql).toContain("'soil_series','biocontrol_stock','fire_hotspots'");
    expect(sql).toContain(
      'safe_limit INTEGER := GREATEST(COALESCE(result_limit, 3), 1);'
    );
  });

  it('keeps every app search table wired into global search SQL', () => {
    const sql = readGlobalSearchSql();
    const appTables = listDatasetKeys().sort();

    expect(getRpcConfigTables(sql).sort()).toEqual(appTables);
    expect(getLegacyWrapperTables(sql).sort()).toEqual(appTables);
    expect(
      appTables.filter((table) => getSearchColumns(table).length === 0)
    ).toEqual([]);
  });

  it('returns search relevance metadata from RPC SQL', () => {
    const sql = readGlobalSearchSql();

    expect(sql).toContain('score');
    expect(sql).toContain('match_column');
    expect(sql).toContain('match_value');
    expect(sql).toContain('match_type');
    expect(sql).toContain('similarity(');
  });

  it('filters private columns for guest and AI reads', () => {
    const columns = getDatasetSelectColumns('smart_farmer_sf', {
      purpose: 'ai',
      columns: ['full_name', 'district', 'main_product'],
    });

    expect(columns).toContain('district');
    expect(columns).toContain('main_product');
    expect(columns).not.toContain('full_name');
  });

  it('centralizes group table access rules', () => {
    expect(getGroupTables('production')).toContain('large_plots');
    expect(canGroupAccessTable('production', 'large_plots')).toBe(true);
    expect(canGroupAccessTable('production', 'personnel')).toBe(false);
  });

  it('centralizes public and district editor access rules', () => {
    expect(canGuestAccessGroup('strategy')).toBe(true);
    expect(canGuestAccessTable('daily_weather')).toBe(true);
    expect(canDistrictEditorWriteTable('personnel')).toBe(true);
    expect(canDistrictEditorWriteTable('large_plots')).toBe(false);
  });

  it('maps department names to group keys', () => {
    expect(getDepartmentGroupKey('กลุ่มส่งเสริมและพัฒนาการผลิต')).toBe(
      'production'
    );
    expect(getDepartmentGroupKey(null)).toBe(null);
  });
});
