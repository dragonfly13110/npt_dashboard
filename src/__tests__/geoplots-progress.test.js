import { describe, expect, it } from 'vitest';
import { toProgressRows } from '../../scripts/sync_geoplots_progress.js';

describe('toProgressRows', () => {
  it('matches GEOPLOTS KPI chart math', () => {
    const [row] = toProgressRows([
      {
        code: 7307,
        name: 'พุทธมณฑล',
        m_code: 73,
        m_name: 'นครปฐม',
        target_2_69: 1240,
        remain_list_68: '27',
        remain_list_67: '43',
        geoplots_68: '740',
        geoplots_67: '108',
        qgis_68: '0',
        qgis_67: '0',
      },
    ]);

    expect(row.drawn_plots).toBe(740);
    expect(row.remaining_target_plots).toBe(500);
    expect(row.progress_percent).toBe(59.68);
    expect(row.total_chart_plots).toBe(2550);
  });
});
