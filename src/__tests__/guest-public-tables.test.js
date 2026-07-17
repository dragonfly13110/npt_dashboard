import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('guest public tables', () => {
  it('keeps unsupported main_crop out of farmer subdistrict queries', () => {
    const page = fs.readFileSync(
      path.join(root, 'src/pages/strategy/FarmerRegistry.jsx'),
      'utf8'
    );

    expect(page).toContain(
      "filter((column) => column.dataIndex !== 'main_crop')"
    );
  });

  it('grants the public personnel training field to anon', () => {
    const sql = fs.readFileSync(
      path.join(root, 'supabase/fix_guest_public_table_columns.sql'),
      'utf8'
    );

    expect(sql).toContain(
      'GRANT SELECT (executive_training) ON personnel TO anon;'
    );
  });

  it('builds the production dashboard from public columns only', () => {
    const hook = fs.readFileSync(
      path.join(root, 'src/hooks/useProductionData.js'),
      'utf8'
    );

    expect(hook).not.toContain("select('*')");
    expect(hook).not.toContain('item.farmer_name');
    expect(hook).toContain('commodity_group, district, member_count, area_rai');
    expect(hook).toContain(
      'crop_name, area_rai, production_volume_kg, exp_date, plot_district'
    );
  });

  it('builds the development dashboard from public columns only', () => {
    const hook = fs.readFileSync(
      path.join(root, 'src/hooks/useDevelopmentData.js'),
      'utf8'
    );

    expect(hook).not.toContain("select('*')");
    expect(hook).toContain("select('district, data_year')");
    expect(hook).toContain("select('spot_type, district')");
  });
});
