import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('public data dictionary route', () => {
  it('registers a read-only public data-dictionary route and links the landing page to it', () => {
    const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
    const landing = fs.readFileSync(
      path.join(root, 'src/pages/LandingPage.jsx'),
      'utf8'
    );

    expect(app).toContain("path: '/public/data-dictionary'");
    expect(landing).toContain('href="/public/data-dictionary"');
  });
});
