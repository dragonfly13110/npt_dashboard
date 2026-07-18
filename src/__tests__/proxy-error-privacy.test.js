import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const proxies = [
  'agritec-proxy.js',
  'doae-esc-proxy.js',
  'doae-hq-proxy.js',
  'doae-npt-proxy.js',
  'gistda-proxy.js',
  'ictc-proxy.js',
  'kku-proxy.js',
  'rss-proxy.js',
  'wp-proxy.js',
];

describe('public proxy errors', () => {
  it('does not expose upstream error messages', () => {
    for (const filename of proxies) {
      const source = fs.readFileSync(
        path.join(root, 'netlify/functions', filename),
        'utf8'
      );
      expect(source).not.toContain('message: err.message');
    }
  });
});
