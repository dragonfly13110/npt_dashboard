import { describe, expect, test } from 'vitest';
import {
  createInstituteV2Rows,
  filterInstituteV2Rows,
  summarizeInstituteV2Rows,
} from './farmerInstitutesV2';

describe('farmer institutes v2 data helpers', () => {
  const source = {
    smartFarmers: [
      { id: 'sf-1', data_year: 2568, full_name: 'A', district: 'เมืองนครปฐม', agricultural_activity: 'ข้าว', annual_agri_income: 1000 },
    ],
    youngSmartFarmers: [
      { id: 'ysf-1', data_year: 2568, full_name: 'B', district: 'สามพราน', agricultural_activity: 'ผัก', farm_area_rai: 2 },
    ],
    housewifeGroups: [
      { id: 'hw-1', year: 2567, group_name: 'กลุ่มแม่บ้าน', district: 'เมืองนครปฐม', member_count: 12, income: 5000, fund_management: 2000 },
    ],
    youngFarmerGroups: [
      { id: 'yfg-1', data_year: 2568, group_name: 'กลุ่มยุว', district: 'สามพราน', member_count: 20, activity: 'แปรรูป' },
    ],
    careerGroups: [
      { id: 'cg-1', data_year: 2568, group_name: 'กลุ่มอาชีพ', district: 'เมืองนครปฐม', member_count: 30, income: 7000, fund_management: 3000 },
    ],
  };

  test('normalizes five detailed datasets into a shared row shape', () => {
    const rows = createInstituteV2Rows(source);

    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.typeKey)).toEqual([
      'smart_farmer_sf',
      'young_smart_farmer_ysf',
      'housewife_farmer_groups',
      'young_farmer_groups_detailed',
      'agricultural_career_groups',
    ]);
    expect(rows[0]).toMatchObject({
      id: 'smart_farmer_sf:sf-1',
      year: 2568,
      name: 'Smart Farmer (SF) #sf-1',
      district: 'เมืองนครปฐม',
      metricValue: 1,
      metricLabel: 'ราย',
      income: 1000,
    });
    expect(rows[2]).toMatchObject({
      id: 'housewife_farmer_groups:hw-1',
      year: 2567,
      name: 'กลุ่มแม่บ้าน',
      metricValue: 12,
      metricLabel: 'สมาชิก',
      income: 5000,
      fund: 2000,
    });
  });

  test('filters by year district and type', () => {
    const rows = createInstituteV2Rows(source);
    const result = filterInstituteV2Rows(rows, {
      year: 2568,
      district: 'เมืองนครปฐม',
      typeKey: 'agricultural_career_groups',
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('กลุ่มอาชีพ');
  });

  test('summarizes counts members income fund and district breakdown', () => {
    const rows = createInstituteV2Rows(source);
    const summary = summarizeInstituteV2Rows(rows);

    expect(summary.totalRows).toBe(5);
    expect(summary.totalMembers).toBe(64);
    expect(summary.totalIncome).toBe(13000);
    expect(summary.totalFund).toBe(5000);
    expect(summary.byDistrict).toEqual([
      { name: 'เมืองนครปฐม', count: 3, members: 43, income: 13000, fund: 5000 },
      { name: 'สามพราน', count: 2, members: 21, income: 0, fund: 0 },
    ]);
  });
});
