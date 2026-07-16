import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('soil series schema', () => {
  it('does not build a GIN index over GeoJSON coordinates', () => {
    const schema = readFileSync('supabase/soil_series.sql', 'utf8');
    const migration = readFileSync(
      'supabase/drop_soil_series_geometry_gin_idx.sql',
      'utf8'
    );
    expect(schema).not.toContain('soil_series_geometry_gin_idx');
    expect(migration).toContain(
      'DROP INDEX IF EXISTS public.soil_series_geometry_gin_idx'
    );
  });
});
