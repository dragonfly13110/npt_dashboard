import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(resolve('public/pwa-icon.svg')).href);
for (const size of [192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.locator('svg').screenshot({
    path: resolve(`public/pwa-icon-${size}.png`),
  });
}
await browser.close();
