import { describe, expect, it } from 'vitest';
import {
  applyFilters,
  pageValue,
} from '../../netlify/functions/public-certifications.js';

function queryRecorder() {
  const calls = [];
  return {
    calls,
    ilike(...args) {
      calls.push(['ilike', ...args]);
      return this;
    },
    eq(...args) {
      calls.push(['eq', ...args]);
      return this;
    },
  };
}

describe('public certifications pagination', () => {
  it('bounds page values and applies only supported public filters', () => {
    expect(pageValue('0', 25, 100)).toBe(1);
    expect(pageValue('999', 25, 100)).toBe(100);

    const query = queryRecorder();
    applyFilters(
      query,
      new URLSearchParams({
        search: 'rice',
        plot_district: 'เมืองนครปฐม',
        cert_date: '2569',
      })
    );

    expect(query.calls).toEqual([
      ['ilike', 'crop_name', '%rice%'],
      ['eq', 'plot_district', 'เมืองนครปฐม'],
      ['ilike', 'cert_date', '%/2569'],
    ]);
  });
});
