import { describe, expect, it } from 'vitest';
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
} from './datasetCatalog';

describe('datasetCatalog', () => {
  it('keeps table routes and search metadata in one place', () => {
    expect(getDatasetRoute('large_plots')).toBe(
      '/dashboard/production/large-plots'
    );
    expect(getSearchColumns('large_plots')).toContain('plot_name');
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
