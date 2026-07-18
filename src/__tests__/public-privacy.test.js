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

  it('keeps personal data and plot codes out of the public GAP API', () => {
    const fn = fs.readFileSync(
      path.join(root, 'netlify/functions/public-certifications.js'),
      'utf8'
    );

    expect(fn).not.toMatch(/farmer_name|phone|telephone|plot_code/);
  });

  it('does not let public endpoints bypass RLS with the service role', () => {
    const endpoints = [
      'public-certifications.js',
      'public-farmer-institutes-v2.js',
    ].map((file) =>
      fs.readFileSync(path.join(root, 'netlify/functions', file), 'utf8')
    );

    expect(endpoints.join('\n')).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('does not select every GAP column to count public results', () => {
    const fn = fs.readFileSync(
      path.join(root, 'netlify/functions/public-certifications.js'),
      'utf8'
    );

    expect(fn).not.toContain(".select('*', { count: 'exact', head: true })");
  });

  it('does not expose database errors from public data endpoints', () => {
    const endpoints = [
      'public-certifications.js',
      'public-farmer-institutes-v2.js',
    ].map((file) =>
      fs.readFileSync(path.join(root, 'netlify/functions', file), 'utf8')
    );

    expect(endpoints.join('\n')).not.toContain('JSON.stringify({ error: err.message })');
  });
});
