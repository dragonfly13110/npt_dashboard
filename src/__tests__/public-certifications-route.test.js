import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('public GAP report', () => {
  it('registers a read-only public GAP route and links the landing card to it', () => {
    const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
    const landing = fs.readFileSync(
      path.join(root, 'src/pages/LandingPage.jsx'),
      'utf8'
    );

    expect(app).toContain("path: '/public/certifications'");
    expect(app).toContain('publicMode={publicMode}');
    expect(landing).toMatch(
      /title: 'พื้นที่รับรอง GAP',[\s\S]*href: '\/public\/certifications'/
    );
  });
});
