# NPT Dashboard Progressive Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้ NPT Dashboard ติดตั้งบนอุปกรณ์ได้ เปิดหน้าแอปเดิมได้เมื่อเน็ตหลุด และอัปเดต cache อย่างปลอดภัยโดยไม่เก็บ API หรือข้อมูลผู้ใช้

**Architecture:** ใช้ Web App Manifest และ Service Worker API ที่มีใน browser โดยตรง ไม่เพิ่ม dependency. Service worker จะ precache เฉพาะ public app shell, ใช้ network-first สำหรับ navigation, stale-while-revalidate สำหรับ static asset ของ origin เดียวกัน และไม่แตะ `/api/`, `/.netlify/functions/` หรือ request ที่ไม่ใช่ GET.

**Tech Stack:** Vite 7, React 19, native Web App Manifest, native Service Worker, Vitest, Playwright

## Global Constraints

- ห้าม cache API, Supabase, request ข้าม origin, request ที่ไม่ใช่ GET หรือ response ที่ไม่สำเร็จ
- ห้ามทำให้หน้าเก่าอยู่ถาวร: เปลี่ยน `CACHE_VERSION` ทุกครั้งที่แก้รายการ precache
- PWA ต้องยังทำงานเป็นเว็บปกติเมื่อ browser ไม่รองรับ service worker
- ใช้ไฟล์และ dependency ที่มีอยู่; ไม่เพิ่ม Workbox หรือ `vite-plugin-pwa`
- ทดสอบ offline กับ production build/preview เพราะ dev server ไม่ใช่หลักฐานว่า service worker production ทำงาน

---

## File Map

- Create `public/manifest.webmanifest`: metadata สำหรับการติดตั้ง
- Create `public/pwa-icon.svg`: ไอคอน installable แบบ `any maskable` ที่ไม่พึ่งไฟล์ภายนอก
- Create `public/offline.html`: fallback เล็กและอ่านได้เมื่อ navigation ไม่มี cache
- Create `public/sw.js`: precache, routing, cleanup และ update lifecycle
- Create `src/registerServiceWorker.js`: register service worker หลังหน้าโหลด
- Modify `src/main.jsx`: เรียก registration เพียงจุดเดียว
- Modify `index.html`: เชื่อม manifest และ metadata สำหรับ mobile
- Modify `netlify.toml`: ป้องกัน browser cache ตัว service worker/manifest นานเกินไป
- Create `src/__tests__/pwa-assets.test.js`: ตรวจ manifest และกติกาความปลอดภัยของ service worker
- Create `tests/e2e/pwa.spec.js`: ตรวจ install metadata และ offline navigation บน production preview
- Modify `playwright.config.js`: ให้เลือกคำสั่ง web server ผ่าน environment variableได้

### Task 1: Installable metadata and icons

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `public/pwa-icon.svg`
- Modify: `index.html`
- Test: `src/__tests__/pwa-assets.test.js`

**Interfaces:**
- Consumes: public asset serving ของ Vite
- Produces: `/manifest.webmanifest`, `/pwa-icon.svg`, `<link rel="manifest">`

- [ ] **Step 1: Write the failing manifest test**

```js
// src/__tests__/pwa-assets.test.js
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
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- src/__tests__/pwa-assets.test.js`

Expected: FAIL because `public/manifest.webmanifest` does not exist.

- [ ] **Step 3: Add the manifest**

```json
{
  "name": "ศูนย์ข้อมูลการเกษตรนครปฐม",
  "short_name": "เกษตรนครปฐม",
  "description": "ศูนย์ข้อมูลการเกษตรจังหวัดนครปฐม",
  "id": "/",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#ffffff",
  "theme_color": "#1a7f37",
  "lang": "th",
  "dir": "ltr",
  "icons": [
    {
      "src": "/pwa-icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 4: Create `public/pwa-icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="เกษตรนครปฐม">
  <rect width="512" height="512" fill="#1a7f37"/>
  <circle cx="256" cy="256" r="196" fill="#ffffff"/>
  <path d="M256 368V206M256 276c-76 0-120-42-120-112 76 0 120 42 120 112Zm0 0c76 0 120-42 120-112-76 0-120 42-120 112Z" fill="none" stroke="#1a7f37" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

- [ ] **Step 5: Link install metadata in `index.html` immediately after the existing theme-color meta**

```html
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="เกษตรนครปฐม" />
```

- [ ] **Step 6: Run the focused test and build**

Run: `npm test -- src/__tests__/pwa-assets.test.js && npm run build`

Expected: test PASS and Vite build completes with `dist/manifest.webmanifest` and `dist/pwa-icon.svg`.

- [ ] **Step 7: Commit**

```bash
git add public/manifest.webmanifest public/pwa-icon.svg index.html src/__tests__/pwa-assets.test.js
git commit -m "feat: add installable PWA metadata"
```

### Task 2: Safe offline app shell

**Files:**
- Create: `public/offline.html`
- Create: `public/sw.js`
- Modify: `src/__tests__/pwa-assets.test.js`

**Interfaces:**
- Consumes: `/`, `/offline.html`, `/favicon.svg`, `/manifest.webmanifest`, `/pwa-icon.svg`
- Produces: cache `npt-dashboard-v1`; navigation fallback; static same-origin cache

- [ ] **Step 1: Add failing service-worker policy tests**

Append inside the existing `describe`:

```js
it('keeps API and private data out of caches', () => {
  const worker = read('public/sw.js');
  expect(worker).toContain("url.pathname.startsWith('/api/')");
  expect(worker).toContain("url.pathname.startsWith('/.netlify/functions/')");
  expect(worker).toContain("request.method !== 'GET'");
});

it('ships an offline navigation fallback', () => {
  expect(read('public/sw.js')).toContain("cache.match('/offline.html')");
  expect(read('public/offline.html')).toContain('ไม่มีการเชื่อมต่ออินเทอร์เน็ต');
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- src/__tests__/pwa-assets.test.js`

Expected: FAIL because `public/sw.js` does not exist.

- [ ] **Step 3: Create the offline document**

```html
<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#1a7f37" />
    <title>ออฟไลน์ | เกษตรนครปฐม</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; color: #17351f; background: #f3faf5; }
      main { max-width: 32rem; padding: 2rem; text-align: center; }
      button { padding: .75rem 1rem; border: 0; border-radius: .5rem; color: white; background: #1a7f37; font: inherit; }
    </style>
  </head>
  <body>
    <main>
      <h1>ไม่มีการเชื่อมต่ออินเทอร์เน็ต</h1>
      <p>เปิดหน้าที่เคยใช้งานไว้ได้บางส่วน หรือลองใหม่เมื่อสัญญาณกลับมา</p>
      <button type="button" onclick="location.reload()">ลองใหม่</button>
    </main>
  </body>
</html>
```

- [ ] **Step 4: Create the service worker**

```js
const CACHE_VERSION = 'npt-dashboard-v1';
const APP_SHELL = [
  '/',
  '/offline.html',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/pwa-icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

const isPrivateRequest = (request, url) =>
  request.method !== 'GET' ||
  url.origin !== self.location.origin ||
  url.pathname.startsWith('/api/') ||
  url.pathname.startsWith('/.netlify/functions/');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (isPrivateRequest(request, url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () =>
          (await caches.match(request)) ||
          (await caches.match('/')) ||
          caches.match('/offline.html')
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fresh = fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
```

- [ ] **Step 5: Run the focused test**

Run: `npm test -- src/__tests__/pwa-assets.test.js`

Expected: all PWA asset tests PASS.

- [ ] **Step 6: Commit**

```bash
git add public/offline.html public/sw.js src/__tests__/pwa-assets.test.js
git commit -m "feat: add safe offline app shell"
```

### Task 3: Register only in production and set deploy cache headers

**Files:**
- Create: `src/registerServiceWorker.js`
- Create: `src/__tests__/registerServiceWorker.test.js`
- Modify: `src/main.jsx`
- Modify: `netlify.toml`

**Interfaces:**
- Consumes: `navigator.serviceWorker`, Vite `import.meta.env.PROD`
- Produces: `registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined>`

- [ ] **Step 1: Write the failing registration test**

```js
// src/__tests__/registerServiceWorker.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('registerServiceWorker', () => {
  beforeEach(() => vi.resetModules());

  it('registers /sw.js after the load event', async () => {
    const register = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });
    const { registerServiceWorker } = await import('../registerServiceWorker');
    const pending = registerServiceWorker(true);
    window.dispatchEvent(new Event('load'));
    await pending;
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- src/__tests__/registerServiceWorker.test.js`

Expected: FAIL because `src/registerServiceWorker.js` does not exist.

- [ ] **Step 3: Implement registration**

```js
export function registerServiceWorker(enabled = import.meta.env.PROD) {
  if (!enabled || !('serviceWorker' in navigator)) return Promise.resolve();
  return new Promise((resolve) => {
    window.addEventListener(
      'load',
      () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(resolve),
      { once: true }
    );
  });
}
```

- [ ] **Step 4: Register once from `src/main.jsx`**

Add:

```js
import { registerServiceWorker } from './registerServiceWorker';
```

Then add immediately after `initMonitoring();`:

```js
registerServiceWorker();
```

- [ ] **Step 5: Set short-lived headers in `netlify.toml` before the `/*` header block**

```toml
[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
    Service-Worker-Allowed = "/"

[[headers]]
  for = "/manifest.webmanifest"
  [headers.values]
    Content-Type = "application/manifest+json; charset=utf-8"
    Cache-Control = "public, max-age=3600"
```

- [ ] **Step 6: Run registration and asset checks**

Run: `npm test -- src/__tests__/registerServiceWorker.test.js src/__tests__/pwa-assets.test.js && npm run build`

Expected: tests PASS and build completes.

- [ ] **Step 7: Commit**

```bash
git add src/registerServiceWorker.js src/__tests__/registerServiceWorker.test.js src/main.jsx netlify.toml
git commit -m "feat: register PWA service worker"
```

### Task 4: Production offline acceptance check

**Files:**
- Create: `tests/e2e/pwa.spec.js`
- Modify: `playwright.config.js`

**Interfaces:**
- Consumes: production build served at `http://localhost:5174`
- Produces: repeatable install/offline acceptance test

- [ ] **Step 1: Allow Playwright to run against production preview**

Replace the `webServer.command` value in `playwright.config.js` with:

```js
command: process.env.PLAYWRIGHT_SERVER_COMMAND || 'npm run dev -- --port 5174',
```

- [ ] **Step 2: Write the PWA acceptance test**

```js
// tests/e2e/pwa.spec.js
import { test, expect } from '@playwright/test';

test('is installable and reopens its shell offline', async ({ page, context }) => {
  const manifestResponse = await page.request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBeTruthy();
  expect((await manifestResponse.json()).display).toBe('standalone');

  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker?.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#root')).toBeAttached();
});
```

- [ ] **Step 3: Run against production build**

PowerShell:

```powershell
npm run build
$env:PLAYWRIGHT_SERVER_COMMAND='npm run preview -- --port 5174'
npx playwright test tests/e2e/pwa.spec.js
Remove-Item Env:PLAYWRIGHT_SERVER_COMMAND
```

Expected: 1 test PASS. If `navigator.serviceWorker.controller` times out, inspect browser console and `/sw.js`; do not weaken the assertion.

- [ ] **Step 4: Run the existing test suite**

Run: `npm test && npm run lint:src`

Expected: all tests PASS and ESLint exits 0.

- [ ] **Step 5: Manual device acceptance on the deployed HTTPS URL**

Use Chrome Android and Safari iOS once each:

1. Open the deployed site and add it to the home screen.
2. Confirm the Thai name and green icon appear.
3. Launch from the icon and confirm standalone display.
4. Open the landing page once, enable airplane mode, close and reopen the app.
5. Confirm the cached shell opens; confirm API-backed live data does not falsely claim it was refreshed.
6. Re-enable network, deploy a build with `CACHE_VERSION = 'npt-dashboard-v2'`, reload once, and confirm the new build replaces v1.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/pwa.spec.js playwright.config.js
git commit -m "test: verify PWA offline behavior"
```

## Definition of Done

- Manifest is valid JSON and linked from `index.html`
- Installed app launches at `/` in standalone mode
- Production service worker controls the page after first load
- Previously opened app shell reopens offline
- API, Netlify Functions, Supabase and cross-origin requests never enter Cache Storage
- Old named caches are deleted on activation
- `/sw.js` is always revalidated by Netlify
- Focused unit tests, production Playwright test, full Vitest suite and source lint pass

## Explicitly Deferred

- Web Push: add only after defining who sends which alert, consent UX, unsubscribe flow and retention policy
- Background Sync: add only when the app has a concrete offline write operation; current dashboard is primarily read-oriented
- Full offline datasets/maps: add only after measuring storage size and defining staleness/privacy rules
- Custom install button: browser install UI is sufficient until analytics show users cannot discover installation
- PNG/iOS splash asset matrix: SVG covers the first installable release; add generated 192/512 PNG and Apple touch icons only if real-device acceptance exposes platform gaps
