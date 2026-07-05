import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('public privacy surfaces', () => {
  it('keeps personal fields out of public search RPC config', () => {
    const sql = fs.readFileSync(
      path.join(root, 'supabase/global_search.sql'),
      'utf8'
    );
    const configBlock = sql.slice(
      sql.indexOf('VALUES'),
      sql.indexOf(') AS t(table_name')
    );

    expect(configBlock).not.toMatch(/full_name|owner_name|contact_person/);
  });

  it('keeps person-level income out of public farmer institute API', () => {
    const fn = fs.readFileSync(
      path.join(root, 'netlify/functions/public-farmer-institutes-v2.js'),
      'utf8'
    );

    expect(fn).not.toContain('annual_agri_income');
  });
});
