import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(path, 'utf8');

describe('PWA public assets', () => {
  it('has installable manifest metadata', () => {
    const manifest = JSON.parse(read('public/manifest.webmanifest'));
    expect(manifest).toMatchObject({
      name: 'ศูนย์ข้อมูลการเกษตรนครปฐม',
      short_name: 'เกษตรนครปฐม',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: '#1a7f37',
      background_color: '#ffffff',
      lang: 'th',
    });
    expect(manifest.icons).toContainEqual(
      expect.objectContaining({ src: '/pwa-icon.svg', purpose: 'any maskable' })
    );
  });

  it('links the manifest from the document', () => {
    expect(read('index.html')).toContain(
      '<link rel="manifest" href="/manifest.webmanifest" />'
    );
  });

  it('keeps API and private data out of caches', () => {
    const worker = read('public/sw.js');
    expect(worker).toContain("url.pathname.startsWith('/api/')");
    expect(worker).toContain("url.pathname.startsWith('/.netlify/functions/')");
    expect(worker).toContain("request.method !== 'GET'");
  });

  it('ships an offline navigation fallback', () => {
    expect(read('public/sw.js')).toContain("caches.match('/offline.html')");
    expect(read('public/offline.html')).toContain(
      'ไม่พบการเชื่อมต่ออินเทอร์เน็ต'
    );
  });
});
