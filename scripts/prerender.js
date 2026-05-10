/**
 * Prerender script - generates static HTML for public SPA routes.
 * Starts vite preview server, visits each route with Playwright,
 * captures fully-rendered HTML (with API data), saves to dist/.
 *
 * Usage: npm run prerender  (or: node scripts/prerender.js)
 * Prereqs: npm run build must have completed (dist/ exists)
 */

import { chromium } from 'playwright';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');

const BASE_URL = 'https://npt-dashboard.netlify.app';
const PREVIEW_PORT = 4173;
const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`;

const ROUTES = [
  { path: '/',                      title: 'หน้าหลัก | ศูนย์ข้อมูลการเกษตรนครปฐม',                     desc: 'ระบบฐานข้อมูลกลางสำนักงานเกษตรจังหวัดนครปฐม — ข้อมูลเกษตรกร พื้นที่เพาะปลูก วิสาหกิจชุมชน Smart Farmer แปลงใหญ่ ท่องเที่ยวเกษตร สภาพอากาศ และราคาสินค้าเกษตร' },
  { path: '/interactive-dashboard', title: 'แผนที่ข้อมูลเกษตร | ศูนย์ข้อมูลการเกษตรนครปฐม',             desc: 'แผนที่โต้ตอบแสดงข้อมูลเกษตรกร พื้นที่เพาะปลูก วิสาหกิจชุมชน และจุดบริการเกษตร ในจังหวัดนครปฐม' },
  { path: '/public/large-plots',    title: 'แปลงใหญ่ | ศูนย์ข้อมูลการเกษตรนครปฐม',                      desc: 'ข้อมูลแปลงเกษตรแปลงใหญ่ ทั้ง 7 อำเภอ ในจังหวัดนครปฐม — รายชื่อแปลง พื้นที่ ชนิดพืช' },
  { path: '/public/smart-farmers',  title: 'Smart Farmer | ศูนย์ข้อมูลการเกษตรนครปฐม',                 desc: 'ทะเบียนเกษตรกร Smart Farmer จังหวัดนครปฐม — รายชื่อ คุณสมบัติ และความเชี่ยวชาญ' },
  { path: '/public/community-enterprises', title: 'วิสาหกิจชุมชน | ศูนย์ข้อมูลการเกษตรนครปฐม',         desc: 'ข้อมูลวิสาหกิจชุมชน จังหวัดนครปฐม — กลุ่มอาชีพ ผลิตภัณฑ์ และสมาชิก' },
  { path: '/public/agri-tourism',   title: 'ท่องเที่ยวเกษตร | ศูนย์ข้อมูลการเกษตรนครปฐม',               desc: 'แหล่งท่องเที่ยวเชิงเกษตรในจังหวัดนครปฐม — สวนผลไม้ ไร่องุ่น แหล่งเรียนรู้' },
  { path: '/public/farmer-institutes', title: 'สถาบันเกษตรกร | ศูนย์ข้อมูลการเกษตรนครปฐม',             desc: 'ข้อมูลสถาบันเกษตรกร — ศูนย์เรียนรู้ ศพก. ศจช. ศดปช. ในจังหวัดนครปฐม' },
  { path: '/public/agricultural-areas', title: 'พื้นที่เพาะปลูก | ศูนย์ข้อมูลการเกษตรนครปฐม',          desc: 'ข้อมูลพื้นที่เพาะปลูกจังหวัดนครปฐม — ข้าว พืชไร่ ผัก ไม้ผล สมุนไพร ไม้ดอกไม้ประดับ' },
];

function injectSEO(html, route) {
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${route.desc}" />`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${BASE_URL}${route.path}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${route.title}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${route.desc}" />`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${BASE_URL}${route.path}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${route.title}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${route.desc}" />`);
}

function startPreviewServer() {
  return new Promise((resolvePromise, reject) => {
    const proc = spawn('npx', ['vite', 'preview', '--port', String(PREVIEW_PORT), '--strictPort'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    const timeout = setTimeout(() => {
      reject(new Error('vite preview failed to start within 30s'));
    }, 30000);

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      if (text.includes('Local:') || text.includes('localhost')) {
        clearTimeout(timeout);
        setTimeout(() => resolvePromise(proc), 1000);
      }
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      if (text.includes('Local:') || text.includes('localhost')) {
        clearTimeout(timeout);
        setTimeout(() => resolvePromise(proc), 1000);
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    proc.on('exit', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`vite preview exited with code ${code}`));
      }
    });
  });
}

async function prerender() {
  if (!existsSync(DIST)) {
    console.error('dist/ not found. Run npm run build first.');
    process.exit(1);
  }

  console.log('Starting vite preview server...');
  let serverProc;
  try {
    serverProc = await startPreviewServer();
  } catch (err) {
    console.error('Failed to start preview server:', err.message);
    process.exit(1);
  }

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });

  try {
    for (const route of ROUTES) {
      const context = await browser.newContext({
        userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
      });
      const page = await context.newPage();

      try {
        const url = `${PREVIEW_URL}${route.path}`;
        console.log(`Prerendering ${route.path} ...`);

        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        // Wait for async data (Supabase / API calls)
        await page.waitForTimeout(8000);

        // Scroll to trigger lazy images / virtual lists
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1500);
        await page.evaluate(() => window.scrollTo(0, 0));

        let html = await page.content();

        // Inject route-specific SEO meta
        html = injectSEO(html, route);

        // Write prerendered HTML
        const outDir = resolve(DIST, `.${route.path}`);
        mkdirSync(outDir, { recursive: true });
        writeFileSync(resolve(outDir, 'index.html'), html, 'utf-8');

        console.log(`  OK -> dist${route.path}/index.html`);
      } catch (err) {
        console.error(`  FAIL ${route.path}:`, err.message);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    serverProc.kill();
  }

  console.log('Done prerendering.');
}

prerender().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
