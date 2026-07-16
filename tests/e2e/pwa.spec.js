import { test, expect } from '@playwright/test';

test('is installable and reopens its shell offline', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const manifestResponse = await page.request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBeTruthy();
  expect((await manifestResponse.json()).display).toBe('standalone');

  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForFunction(() => navigator.serviceWorker?.controller, null, {
    timeout: 10000,
  });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
  await expect(page.locator('#root')).toBeAttached();
  await context.setOffline(false);
  await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister())
    );
  });
  await page.goto('about:blank');
  await context.close();
});
