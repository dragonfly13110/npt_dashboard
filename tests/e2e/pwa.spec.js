import { test, expect } from '@playwright/test';

test('is installable and reopens its shell offline', async ({
  page,
  context,
}) => {
  const manifestResponse = await page.request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBeTruthy();
  expect((await manifestResponse.json()).display).toBe('standalone');

  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker?.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#root')).toBeAttached();
});
