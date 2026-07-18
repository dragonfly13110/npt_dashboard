import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('security headers', () => {
  it('locks down CSP browser escape hatches', () => {
    const netlify = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');

    expect(netlify).toContain("base-uri 'self'");
    expect(netlify).toContain("form-action 'self'");
    expect(netlify).toContain("frame-ancestors 'none'");
    expect(netlify).toContain("object-src 'none'");
    expect(netlify).toContain('Strict-Transport-Security = "max-age=31536000"');
  });
});
