import { test, expect } from '@playwright/test';

for (const viewport of [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1440, height: 1000 },
]) {
  test(`${viewport.name} keeps landing content inside viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByTestId('landing-search')).toBeVisible();
    if (viewport.name !== 'desktop') {
      await expect(page.locator('.premium-hero-visual')).toBeHidden();
    } else {
      await expect(page.locator('.premium-hero-visual')).toBeVisible();
    }
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });
}
