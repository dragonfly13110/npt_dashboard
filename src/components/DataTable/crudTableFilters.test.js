import { describe, expect, it } from 'vitest';
import {
  getCrudFilterConfig,
  getCrudLocationKeys,
  getSubdistrictsList,
} from './crudTableFilters';

describe('crudTableFilters', () => {
  it('detects district and subdistrict columns', () => {
    expect(
      getCrudLocationKeys([
        { dataIndex: 'name' },
        { dataIndex: 'plot_district' },
        { dataIndex: 'plot_subdistrict' },
      ])
    ).toEqual({
      district: 'plot_district',
      subdistrict: 'plot_subdistrict',
    });
  });

  it('returns subdistrict options for a district', () => {
    const options = getSubdistrictsList('เมืองนครปฐม');

    expect(options.length).toBeGreaterThan(0);
    expect(options).toEqual(
      [...options].sort((a, b) => a.localeCompare(b, 'th'))
    );
  });

  it('adds district and subdistrict filters when columns support them', () => {
    const config = getCrudFilterConfig(
      [],
      { district: 'district', subdistrict: 'subdistrict' },
      { district: 'เมืองนครปฐม' }
    );

    expect(config.map((item) => item.key).slice(0, 2)).toEqual([
      'district',
      'subdistrict',
    ]);
    expect(config[1].options.length).toBeGreaterThan(0);
  });
});
