import { describe, expect, it } from 'vitest';
import rows from '../data/disasters_by_village_seed.json';
import {
  groupPointsByYear,
  groupSum,
  sumField,
  toFloodMapPoint,
} from '../utils/floodData';

describe('flood workbook data', () => {
  it('ships every workbook row without personal identifiers', () => {
    expect(rows).toHaveLength(5013);
    expect(rows[0]).toMatchObject({
      year: 2563,
      district: 'บางเลน',
      activity_group: 'พืชผัก',
      crop_type: 'แค',
      planted_area_rai: 1,
      affected_area_rai: 1,
    });
    expect(JSON.stringify(rows)).not.toMatch(
      /ชื่อ-นามสกุล|ActivityID|farmer_name|activity_id/
    );
  });

  it('summarizes affected rai for KPIs and charts', () => {
    expect(sumField(rows, 'affected_area_rai')).toBeCloseTo(11155.1625, 4);
    const byYear = groupSum(rows, 'year', 'affected_area_rai');
    expect(byYear.map((item) => item.name)).toEqual([
      2563, 2564, 2565, 2567, 2568,
    ]);
    expect(byYear.map((item) => item.value)).toEqual([
      899, 4780.625, 4331.707500000001, 153.5, 990.33,
    ]);
  });

  it('maps only coordinates inside Nakhon Pathom', () => {
    const points = rows.map(toFloodMapPoint).filter(Boolean);
    expect(points).toHaveLength(4928);
    expect(points[0]).toMatchObject({ id: 1, district: 'บางเลน' });
    expect(points[0].lat).toBeGreaterThan(13.64);
    expect(points[0].lng).toBeLessThan(100.34);
  });

  it('groups map points into ascending year layers', () => {
    const grouped = groupPointsByYear([
      { id: 3, year: 2568 },
      { id: 1, year: 2563 },
      { id: 2, year: 2568 },
    ]);

    expect(grouped.map(([year]) => year)).toEqual([2563, 2568]);
    expect(grouped[1][1].map(({ id }) => id)).toEqual([3, 2]);
  });

  it('maps workbook rows into searchable flood disaster records', async () => {
    const { toFloodDisasterRecord } = await import('../utils/floodData');

    expect(toFloodDisasterRecord(rows[0])).toMatchObject({
      source_row_id: 1,
      year: 2563,
      district: 'บางเลน',
      subdistrict: 'บางปลา',
      village_no: '3',
      disaster_type: 'อุทกภัย',
      activity_group: 'พืชผัก',
      crop_type: 'แค',
      planted_area_rai: 1,
      affected_area_rai: 1,
    });
  });
});
