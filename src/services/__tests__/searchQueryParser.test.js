import { describe, expect, it } from 'vitest';
import { parseSearchQuery } from '../searchQueryParser';

describe('parseSearchQuery', () => {
  it('extracts district, crop, year, and budget table hint', () => {
    expect(parseSearchQuery('ข้าว สามพราน งบ 2569')).toEqual({
      raw: 'ข้าว สามพราน งบ 2569',
      terms: ['ข้าว'],
      districts: ['สามพราน'],
      crops: ['ข้าว'],
      years: [2569],
      tableHints: ['budgets'],
    });
  });

  it('maps soil and protection keywords to table hints', () => {
    expect(parseSearchQuery('ชุดดิน บางเลน').tableHints).toEqual([
      'soil_series',
    ]);
    expect(parseSearchQuery('โรค แมลง ข้าว').tableHints).toEqual([
      'ai_disease_forecasts',
      'forecast_plots',
    ]);
  });

  it('maps asset keywords to assets table hint', () => {
    expect(parseSearchQuery('เครื่องชั่ง ครุภัณฑ์').tableHints).toEqual([
      'assets',
    ]);
  });
  it('maps newly searchable table keywords to table hints', () => {
    expect(parseSearchQuery('บุคลากร GIS ชีวภัณฑ์').tableHints).toEqual([
      'personnel',
      'gis_areas',
      'biocontrol_stock',
    ]);
    expect(parseSearchQuery('ระบาดศัตรูพืช กลุ่มแม่บ้าน').tableHints).toEqual([
      'housewife_farmer_groups',
      'pest_outbreaks',
    ]);
  });
});
