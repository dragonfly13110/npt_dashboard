import { describe, expect, it } from 'vitest';
import {
  estimateRiceTons,
  parseRiceHarvestTable,
  validateRiceHarvestRecords,
} from '../utils/riceHarvest';

const MONTH_NOVEMBER = '\u0e1e\u0e24\u0e28\u0e08\u0e34\u0e01\u0e32\u0e22\u0e19';
const DISTRICT_BANG_LEN = '\u0e2d\u0e33\u0e40\u0e20\u0e2d \u0e1a\u0e32\u0e07\u0e40\u0e25\u0e19';

const FIXTURE_HTML = `
  <table>
    <thead>
      <tr><th rowspan="2">\u0e23\u0e2b\u0e31\u0e2a</th><th rowspan="2">\u0e08\u0e31\u0e07\u0e2b\u0e27\u0e31\u0e14/\u0e2d\u0e33\u0e40\u0e20\u0e2d/\u0e15\u0e33\u0e1a\u0e25/\u0e2b\u0e21\u0e39\u0e48</th><th colspan="3">${MONTH_NOVEMBER}</th></tr>
      <tr><th>\u0e04\u0e23\u0e31\u0e27\u0e40\u0e23\u0e37\u0e2d\u0e19</th><th>\u0e41\u0e1b\u0e25\u0e07</th><th>\u0e40\u0e19\u0e37\u0e49\u0e2d\u0e17\u0e35\u0e48 (\u0e44\u0e23\u0e48)</th></tr>
    </thead>
    <tbody>
      <tr><td>2-730000</td><td>\u0e19\u0e04\u0e23\u0e1b\u0e10\u0e21</td><td>10,278</td><td>21,791</td><td>176,362.73</td></tr>
      <tr><td>2-730100</td><td>\u0e2d\u0e33\u0e40\u0e20\u0e2d \u0e40\u0e21\u0e37\u0e2d\u0e07\u0e19\u0e04\u0e23\u0e1b\u0e10\u0e21</td><td>163</td><td>451</td><td>2,394.11</td></tr>
      <tr><td>2-730200</td><td>\u0e2d\u0e33\u0e40\u0e20\u0e2d \u0e01\u0e33\u0e41\u0e1e\u0e07\u0e41\u0e2a\u0e19</td><td>74</td><td>142</td><td>882.95</td></tr>
      <tr><td>2-730300</td><td>\u0e2d\u0e33\u0e40\u0e20\u0e2d \u0e19\u0e04\u0e23\u0e0a\u0e31\u0e22\u0e28\u0e23\u0e35</td><td>140</td><td>299</td><td>1,925.25</td></tr>
      <tr><td>2-730400</td><td>\u0e2d\u0e33\u0e40\u0e20\u0e2d \u0e14\u0e2d\u0e19\u0e15\u0e39\u0e21</td><td>77</td><td>142</td><td>816.28</td></tr>
      <tr><td>2-730500</td><td>${DISTRICT_BANG_LEN}</td><td>376</td><td>751</td><td>61,550.41</td></tr>
      <tr><td>2-730600</td><td>\u0e2d\u0e33\u0e40\u0e20\u0e2d \u0e2a\u0e32\u0e21\u0e1e\u0e23\u0e32\u0e19</td><td>33</td><td>60</td><td>553.25</td></tr>
      <tr><td>2-730700</td><td>\u0e2d\u0e33\u0e40\u0e20\u0e2d \u0e1e\u0e38\u0e17\u0e18\u0e21\u0e13\u0e11\u0e25</td><td>25</td><td>89</td><td>418.01</td></tr>
    </tbody>
  </table>
`;

describe('rice harvest parsing', () => {
  it('parses district harvest-month area and estimates tonnes at 0.8 per rai', () => {
    const result = parseRiceHarvestTable(FIXTURE_HTML, { cropYear: '69_1' });
    const bangLen = result.records.find(
      (row) => row.district === DISTRICT_BANG_LEN
    );

    expect(bangLen).toMatchObject({
      districtCode: '2-730500',
      harvestMonth: 11,
      householdCount: 376,
      plotCount: 751,
      areaRai: 61550.41,
      estimatedTons: 49240.328,
    });
    expect(result.records).toHaveLength(7);
    expect(result.provinceTotal.areaRai).toBe(176362.73);
  });

  it('estimates exactly 0.8 tonnes per rai', () => {
    expect(estimateRiceTons(1)).toBe(0.8);
    expect(estimateRiceTons(61550.41)).toBe(49240.328);
  });

  it('rejects empty, duplicate, missing-district, and negative-area snapshots', () => {
    expect(validateRiceHarvestRecords([], null).ok).toBe(false);
    expect(
      validateRiceHarvestRecords(
        [{ districtCode: '2-730100', harvestMonth: 11, areaRai: 1 }],
        null
      ).ok
    ).toBe(false);
    expect(
      validateRiceHarvestRecords(
        Array.from({ length: 7 }, (_, index) => ({
          districtCode: `2-730${String(index + 1).padStart(3, '0')}`,
          harvestMonth: 11,
          areaRai: index === 0 ? -1 : 1,
        })),
        null
      ).ok
    ).toBe(false);
    expect(
      validateRiceHarvestRecords(
        Array.from({ length: 7 }, (_, index) => ({
          districtCode: `2-730${String(index + 1).padStart(3, '0')}`,
          harvestMonth: 11,
          areaRai: 1,
        })).concat({
          districtCode: '2-730100',
          harvestMonth: 11,
          areaRai: 1,
        }),
        null
      ).ok
    ).toBe(false);
  });
});
