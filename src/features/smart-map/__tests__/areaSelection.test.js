import { describe, expect, it } from 'vitest';
import {
  EMPTY_AREA_SELECTION,
  areaSummaryScope,
  choroplethScope,
  selectDistrict,
  selectSubdistrict,
} from '../utils/areaSelection';

describe('smart map area selection', () => {
  it('uses the selected subdistrict for its detail summary and its district for choropleth', () => {
    const district = selectDistrict(EMPTY_AREA_SELECTION, {
      name: 'Mueang',
      areaSqkm: 10,
    });
    const selection = selectSubdistrict(district, {
      code: '730101',
      name: 'Phra Pathom Chedi',
      areaSqkm: 2,
    });

    expect(areaSummaryScope(selection)).toEqual({
      level: 'subdistrict',
      districtName: 'Mueang',
      subdistrictName: 'Phra Pathom Chedi',
    });
    expect(choroplethScope(selection)).toEqual({
      level: 'district',
      districtName: 'Mueang',
    });
  });

  it('keeps the summary scope independent from boundary visibility', () => {
    const selection = selectDistrict(EMPTY_AREA_SELECTION, { name: 'Mueang' });

    expect(areaSummaryScope(selection)).toEqual({
      level: 'district',
      districtName: 'Mueang',
    });
  });
});
