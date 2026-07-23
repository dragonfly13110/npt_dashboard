import { describe, expect, it } from 'vitest';
import {
  toProgressRows,
  toSubdistrictProgressRows,
} from '../../scripts/sync_geoplots_progress.js';

describe('toProgressRows', () => {
  it('matches GEOPLOTS KPI chart math', () => {
    const [row] = toProgressRows([
      {
        code: 7307,
        name: 'พุทธมณฑล',
        m_code: 73,
        m_name: 'นครปฐม',
        target_2_69: 1240,
        remain_list_68: '0',
        remain_list_67: '0',
        geoplots_68: '755',
        geoplots_67: '134',
        qgis_68: '0',
        qgis_67: '0',
      },
    ]);

    expect(row.drawn_plots).toBe(1240);
    expect(row.remaining_target_plots).toBe(0);
    expect(row.progress_percent).toBe(100);
    expect(row.total_chart_plots).toBe(2480);
  });

  it('keeps progress above 100 percent when completed plots exceed target', () => {
    const [row] = toProgressRows([
      { code: 7302, name: 'district', target_2_69: 1851, geoplots_68: 2181 },
    ]);

    expect(row.progress_percent).toBe(117.83);
  });

  it('does not add DOAE while a remaining list still exists', () => {
    const [row] = toProgressRows([
      {
        code: 7305,
        name: 'district',
        target_2_69: 2975,
        remain_list_68: 2537,
        remain_list_67: 623,
        geoplots_68: 2377,
      },
    ]);

    expect(row.doae_plots).toBe(0);
    expect(row.progress_percent).toBe(79.9);
  });

  it('keeps district metadata for subdistrict rows', () => {
    const [row] = toSubdistrictProgressRows(
      [
        {
          code: 730101,
          name: 'พระปฐมเจดีย์',
          target_2_69: '10',
          geoplots_68: '4',
          qgis_68: '1',
        },
      ],
      {
        district_code: '7301',
        district: 'เมืองนครปฐม',
        province_code: '73',
        province: 'นครปฐม',
      }
    );

    expect(row).toMatchObject({
      district_code: '7301',
      district: 'เมืองนครปฐม',
      subdistrict_code: '730101',
      subdistrict: 'พระปฐมเจดีย์',
      drawn_plots: 10,
      progress_percent: 100,
    });
  });
});
