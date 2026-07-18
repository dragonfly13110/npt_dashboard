import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('public server errors', () => {
  it('hides internal forecast and webhook failures', () => {
    const webhook = fs.readFileSync(
      path.join(root, 'netlify/functions/line-webhook.js'),
      'utf8'
    );
    const forecast = fs.readFileSync(
      path.join(root, 'netlify/functions/forecast-disease-insect.js'),
      'utf8'
    );
    const dictionary = fs.readFileSync(
      path.join(root, 'netlify/functions/data-dictionary.js'),
      'utf8'
    );

    expect(webhook).not.toContain("JSON.stringify({ error: err.message })");
    expect(webhook).not.toContain("event.httpMethod === 'GET'");
    expect(forecast).not.toContain("JSON.stringify({ error: err.message })");
    expect(dictionary).not.toContain('err.message ||');
    expect(dictionary).not.toContain('Missing Supabase service configuration.');
  });
});
