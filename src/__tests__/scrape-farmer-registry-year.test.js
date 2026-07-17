import { describe, expect, it } from 'vitest';
import { getReportDataYear } from '../../scripts/scrape_farmer_registry.js';

describe('farmer registry report year', () => {
  it('uses the configured report route instead of an older year in page text', () => {
    expect(
      getReportDataYear(
        'https://farmer.doae.go.th/ecoplant/eco_report/report_fmdfbd_pv69/73/',
        '<h1>รายงานปี 2568/69</h1>'
      )
    ).toBe(2569);
  });
});
