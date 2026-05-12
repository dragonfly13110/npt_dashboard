import { describe, expect, test } from 'vitest';
import { calculateCoconutRecord, getCoconutRound, normalizeImportedCoconutRow } from './coconutAromatic';

describe('coconut aromatic calculations', () => {
  test('calculates derived area, cost, yield, and income fields', () => {
    const result = calculateCoconutRecord({
      own_area_rai: 2,
      rented_area_rai: 3,
      production_cost_per_rai: 1200,
      standard_fruit_per_rai: 80,
      standard_price_per_fruit: 15,
      small_fruit_per_rai: 20,
      small_price_per_fruit: 8,
    });

    expect(result).toEqual({
      planted_area_rai: 5,
      cost_per_fruit: 100,
      standard_percent: 80,
      standard_income_per_rai: 1200,
      small_percent: 20,
      small_income_per_rai: 160,
      total_fruit_per_rai: 100,
      income_per_rai: 1360,
      total_income: 6800,
    });
  });

  test('assigns 20 day collection rounds from 1 June 2026', () => {
    expect(getCoconutRound('2026-06-01')).toMatchObject({
      round_no: 1,
      round_label: 'รอบที่ 1',
      round_start_date: '2026-06-01',
      round_end_date: '2026-06-20',
    });
    expect(getCoconutRound('2026-06-21')).toMatchObject({
      round_no: 2,
      round_start_date: '2026-06-21',
      round_end_date: '2026-07-10',
    });
  });

  test('normalizes imported worksheet rows and adds calculated values', () => {
    const result = normalizeImportedCoconutRow({
      วันที่จัดเก็บ: '2026-06-21',
      รหัส: 'N1-001',
      'ชื่อ - สกุล': 'สมชาย ใจดี',
      ตำบล: 'ขุนแก้ว',
      อำเภอ: 'นครชัยศรี',
      'พื้นที่ตนเอง /ครอบครัว (ไร่)': '1.5',
      'พื้นที่เช่า (ไร่)': '0.5',
      'ต้นทุนการผลิตเฉลี่ยต่อไร่(บาท/ไร่/ปี)': '600',
      'จำนวนผลมาตรฐาน(ผล / ไร่)': '40',
      'ราคาเฉลี่ยต่อผลมาตรฐาน(บาท)': '20',
      'จำนวนผลเล็ก(ผล / ไร่)': '10',
      'ราคาเฉลี่ยต่อผลเล็ก(บาท)': '5',
    });

    expect(result).toMatchObject({
      record_date: '2026-06-21',
      round_no: 2,
      farmer_code: 'N1-001',
      farmer_name: 'สมชาย ใจดี',
      planted_area_rai: 2,
      total_fruit_per_rai: 50,
      income_per_rai: 850,
      total_income: 1700,
    });
  });
});
