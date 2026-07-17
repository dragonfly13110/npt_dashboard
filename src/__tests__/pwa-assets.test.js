import { existsSync, readFileSync } from 'node:fs';
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
      expect.objectContaining({ src: '/pwa-icon-192-v2.png', sizes: '192x192' })
    );
    expect(manifest.icons).toContainEqual(
      expect.objectContaining({ src: '/pwa-icon-512-v2.png', sizes: '512x512' })
    );
    expect(existsSync('public/pwa-icon-192-v2.png')).toBe(true);
    expect(existsSync('public/pwa-icon-512-v2.png')).toBe(true);
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

  it('ships the approved NPT leaf mark and push handlers', () => {
    const logo = read('public/pwa-icon.svg');
    const worker = read('public/sw.js');
    expect(logo).toContain('NPT');
    expect(logo).toContain('#14532d');
    expect(logo).toContain('#c9a227');
    expect(worker).toContain("self.addEventListener('push'");
    expect(worker).toContain("self.addEventListener('notificationclick'");
  });
});
