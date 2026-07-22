import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    'supabase/migrations/20260722173000_scope_personnel_reads_by_role.sql'
  ),
  'utf8'
);

describe('personnel RLS', () => {
  it('scopes authenticated reads by role and location', () => {
    expect(migration).toContain("current_profile_role() = 'admin'");
    expect(migration).toContain(
      "current_profile_department() = 'ฝ่ายบริหารทั่วไป'"
    );
    expect(migration).toContain("current_profile_role() = 'district_editor'");
    expect(migration).toContain(
      'district = public.current_profile_department()'
    );
    expect(migration).toContain("office_type = 'Provincial'");
    expect(migration).not.toMatch(
      /FOR SELECT\s+TO authenticated(?:,\s*anon)?\s+USING \(true\)/i
    );
  });
});
