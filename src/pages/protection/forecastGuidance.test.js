import { describe, expect, it } from 'vitest';
import {
  getActionSummary,
  getForecastWindow,
  getPriorityDetails,
  hasChemicalAdvice,
} from './forecastGuidance';

describe('forecast guidance', () => {
  it('prioritizes risk and keeps chemical advice guarded', () => {
    expect(
      getPriorityDetails([
        { name: 'ต่ำ', risk_level: 'ต่ำ' },
        { name: 'สูง', risk_level: 'สูง' },
      ])[0].name
    ).toBe('สูง');
    expect(getForecastWindow('2026-07-30')).toHaveLength(7);
    expect(getActionSummary('ระบายน้ำทันที. ตรวจซ้ำพรุ่งนี้')).toBe(
      'ระบายน้ำทันที'
    );
    expect(hasChemicalAdvice('พ่นสารเมทาแลกซิลตามฉลาก')).toBe(true);
  });
});
