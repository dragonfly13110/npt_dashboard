import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('public search', () => {
  it('keeps landing search outside the internal dashboard', () => {
    const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
    const landing = fs.readFileSync(
      path.join(root, 'src/pages/LandingPage.jsx'),
      'utf8'
    );
    const search = fs.readFileSync(
      path.join(root, 'src/pages/SearchResults.jsx'),
      'utf8'
    );

    expect(app).toContain("path: '/public/search'");
    expect(landing).toContain('/public/search?q=');
    expect(landing).toContain('href="/public/search">เข้าดูข้อมูล</a>');
    expect(landing).toContain('สำหรับเจ้าหน้าที่');
    expect(search).toContain("publicMode ? 'guest' : role");
    expect(search).toContain('!publicMode && (');
  });
});
