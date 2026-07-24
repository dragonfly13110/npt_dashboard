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
    {
      district:
        '\u0e40\u0e21\u0e37\u0e2d\u0e07\u0e19\u0e04\u0e23\u0e1b\u0e10\u0e21',
      data_year: 2569,
      value: 1,
    },
    {
      district: '\u0e1a\u0e32\u0e07\u0e40\u0e25\u0e19',
      data_year: 2568,
      value: 2,
    },
  ];

  it('filters supported district and year fields', () => {
    expect(
      filterRows(rows, {
        district:
          '\u0e40\u0e21\u0e37\u0e2d\u0e07\u0e19\u0e04\u0e23\u0e1b\u0e10\u0e21',
        year: '2569',
      })
    ).toEqual([rows[0]]);
  });

  it('keeps rows when a dataset has no year field', () => {
    expect(
      filterRows(
        [{ district: '\u0e1a\u0e32\u0e07\u0e40\u0e25\u0e19', value: 2 }],
        { district: '\u0e1a\u0e32\u0e07\u0e40\u0e25\u0e19', year: '2569' },
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
      label:
        '\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e25\u0e48\u0e32\u0e2a\u0e38\u0e14',
    });
  });
});
