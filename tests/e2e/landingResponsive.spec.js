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
    await expect(page.locator('.premium-hero-visual')).toBeVisible();

    const heroLayout = await page.locator('.premium-hero').evaluate((hero) => {
      const copy = hero.querySelector('.premium-hero-copy');
      const heroRect = hero.getBoundingClientRect();
      const copyRect = copy.getBoundingClientRect();
      return {
        alignment: getComputedStyle(copy).textAlign,
        centerOffset: Math.abs(
          copyRect.left +
            copyRect.width / 2 -
            (heroRect.left + heroRect.width / 2)
        ),
      };
    });
    expect(heroLayout.alignment).toBe('center');
    expect(heroLayout.centerOffset).toBeLessThan(2);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });
}
