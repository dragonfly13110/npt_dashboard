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
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });
}

test('mobile prioritizes search, situation and KPI before map', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const y = async (id) => (await page.getByTestId(id).boundingBox()).y;
  expect(await y('landing-search')).toBeLessThan(await y('situation-strip'));
  expect(await y('situation-strip')).toBeLessThan(await y('kpi-grid'));
  expect(await y('kpi-grid')).toBeLessThan(await y('landing-map'));
  const menu = page.getByRole('button', { name: 'เปิดเมนู' });
  const box = await menu.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
});
