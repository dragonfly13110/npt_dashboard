import { describe, expect, it } from 'vitest';
import {
  LATEST_YEAR,
  collectYears,
  filterRows,
  normalizeYear,
  yearStatus,
} from './filters';

describe('interactive dashboard filters', () => {
  const rows = [
    { district: 'เน€เธกเธทเธญเธเธเธเธฃเธเธเธก', data_year: 2569, value: 1 },
    { district: 'เธเธฒเธเน€เธฅเธ', data_year: 2568, value: 2 },
  ];

  it('filters supported district and year fields', () => {
    expect(
      filterRows(rows, {
        district: 'เน€เธกเธทเธญเธเธเธเธฃเธเธเธก',
        year: '2569',
      })
    ).toEqual([rows[0]]);
  });

  it('keeps rows when a dataset has no year field', () => {
    expect(
      filterRows(
        [{ district: 'เธเธฒเธเน€เธฅเธ', value: 2 }],
        { district: 'เธเธฒเธเน€เธฅเธ', year: '2569' },
        { yearKey: null }
      )
    ).toHaveLength(1);
  });

  it('collects Buddhist years and defaults invalid values to latest', () => {
    expect(collectYears([{ rows, yearKey: 'data_year' }])).toEqual([
      2569, 2568,
    ]);
    expect(normalizeYear('bad')).toBe(LATEST_YEAR);
  });

  it('discloses unsupported year filters', () => {
    expect(yearStatus('2569', null)).toEqual({
      supported: false,
      label: 'เธเนเธญเธกเธนเธฅเธฅเนเธฒเธชเธธเธ”',
    });
  });
});
