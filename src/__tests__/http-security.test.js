import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  corsHeaders,
  isOriginAllowed,
} from '../../netlify/functions/lib/http-security.js';

function listFunctionFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory() ? listFunctionFiles(fullPath) : [fullPath];
  });
}

describe('HTTP security helpers', () => {
  beforeEach(() => {
    process.env.ALLOWED_ORIGINS =
      'https://npt.example, https://preview.example';
  });

  afterEach(() => {
    delete process.env.ALLOWED_ORIGINS;
  });

  it('allows configured, localhost, and originless requests', () => {
    expect(isOriginAllowed('https://npt.example')).toBe(true);
    expect(isOriginAllowed('http://localhost:5173')).toBe(true);
    expect(isOriginAllowed('')).toBe(true);
    expect(isOriginAllowed(null)).toBe(true);
  });

  it('rejects unknown browser origins', () => {
    expect(isOriginAllowed('https://evil.example')).toBe(false);
  });

  it('echoes only an allowed origin in CORS headers', () => {
    expect(corsHeaders('https://npt.example')).toMatchObject({
      'Access-Control-Allow-Origin': 'https://npt.example',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      Vary: 'Origin',
    });
    expect(corsHeaders('https://evil.example')).not.toHaveProperty(
      'Access-Control-Allow-Origin'
    );
  });

  it('does not leave wildcard CORS in Netlify functions', () => {
    const functionFiles = listFunctionFiles(
      join(process.cwd(), 'netlify/functions')
    ).filter((file) => /\.(cjs|js)$/.test(file));

    for (const file of functionFiles) {
      expect(readFileSync(file, 'utf8')).not.toMatch(
        /Access-Control-Allow-Origin['"]?\s*:\s*['"]\*/
      );
    }
  });
});
