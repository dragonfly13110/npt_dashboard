import { describe, expect, it } from 'vitest';
import {
  filterTbkCultivationRows,
  parseTbkCultivationTable,
  summarizeTbkCultivationRows,
  topTbkCultivationItems,
  validateTbkCultivationRows,
} from '../utils/tbkCultivation';

const FIXTURE = `
<table id="table_id_1">
  <thead>
    <tr><th>รหัส</th><th>จังหวัด/อำเภอ/ตำบล/หมู่</th><th>พืช/พันธ์พืช</th><th>จำนวน</th><th>ภัยธรรมชาติ</th><th>คงเหลือ</th></tr>
    <tr><th>ครัวเรือน</th><th>แปลง</th><th>เนื้อที่ (ไร่)</th><th>ครัวเรือน</th><th>แปลง</th><th>เนื้อที่ (ไร่)</th><th>เนื้อที่ (ไร่)</th></tr>
  </thead>
  <tbody>
    <tr><td>2-73</td><td>นครปฐม</td><td>ข้าวเจ้า (กข41 ไม่ไวแสง)</td><td>8,376</td><td>17,424</td><td>143,062.07</td><td>1</td><td>2</td><td>10.50</td><td>143,051.57</td></tr>
    <tr><td>2-73</td><td>นครปฐม</td><td>ข้าวเจ้า (กข43 ไม่ไวแสง)</td><td>7</td><td>17</td><td>134.38</td><td>0</td><td>0</td><td>0.0</td><td>134.38</td></tr>
  </tbody>
</table>`;

describe('TBK cultivation report', () => {
  it('parses all ten source cells and comma numbers', () => {
    const [row] = parseTbkCultivationTable(FIXTURE, {
      dataYear: 2569,
      groupCode: '01',
      groupName: 'ข้าว',
    });

    expect(row).toMatchObject({
      dataYear: 2569,
      groupCode: '01',
      groupName: 'ข้าว',
      locationCode: '2-73',
      locationName: 'นครปฐม',
      itemBreed: 'ข้าวเจ้า (กข41 ไม่ไวแสง)',
      householdCount: 8376,
      plotCount: 17424,
      areaRai: 143062.07,
      disasterHouseholdCount: 1,
      disasterPlotCount: 2,
      disasterAreaRai: 10.5,
      remainingAreaRai: 143051.57,
    });
  });

  it('rejects empty, malformed, duplicate, and negative rows', () => {
    expect(validateTbkCultivationRows([]).ok).toBe(false);

    const rows = parseTbkCultivationTable(FIXTURE, {
      dataYear: 2569,
      groupCode: '01',
      groupName: 'ข้าว',
    });
    expect(validateTbkCultivationRows([...rows, rows[0]]).ok).toBe(false);
    expect(validateTbkCultivationRows([{ ...rows[0], areaRai: -1 }]).ok).toBe(
      false
    );
  });

  it('filters rows and calculates totals from only visible rows', () => {
    const rows = parseTbkCultivationTable(FIXTURE, {
      dataYear: 2569,
      groupCode: '01',
      groupName: 'ข้าว',
    });
    const filtered = filterTbkCultivationRows(rows, {
      groupCode: '01',
      locationName: 'นครปฐม',
      search: 'กข43',
    });

    expect(filtered).toHaveLength(1);
    expect(summarizeTbkCultivationRows(filtered)).toEqual({
      rowCount: 1,
      householdCount: 7,
      plotCount: 17,
      areaRai: 134.38,
      disasterAreaRai: 0,
      remainingAreaRai: 134.38,
    });
  });

  it('aggregates and ranks the largest cultivated areas', () => {
    const rows = [
      { itemBreed: 'ข้าว กข41', areaRai: 30 },
      { itemBreed: 'ข้าว กข43', areaRai: 20 },
      { itemBreed: 'ข้าว กข41', areaRai: 15 },
    ];

    expect(topTbkCultivationItems(rows, 1)).toEqual([
      { itemBreed: 'ข้าว กข41', areaRai: 45 },
    ]);
  });
});
