import { test, expect } from '@playwright/test';

test.describe('NPT Dashboard Main Flow', () => {
  test('should login as guest and view dashboards', async ({ page }) => {
    // 1. Visit Landing Page
    await page.goto('/');
    await expect(page).toHaveTitle(/ศูนย์ข้อมูลการเกษตรนครปฐม/);

    // 2. Click Login
    await page.click('button:has-text("เข้าสู่ระบบ")');
    await expect(page).toHaveURL(/\/login/);

    // 3. Login as Guest
    await page.click('button:has-text("บุคคลทั่วไป (เข้าชมข้อมูล)")');

    // 4. Verify redirected to Dashboard
    await page.waitForURL(/\/dashboard/);
    await expect(
      page.locator('text=ภาพรวมข้อมูลทั้งหมด').first()
    ).toBeVisible();

    // 5. Navigate to Strategy Dashboard
    await page.click('text=กลุ่มยุทธศาสตร์และสารสนเทศ');
    await page
      .locator('[data-menu-id*="/dashboard/strategy/overview"]')
      .click();
    await expect(
      page.locator('text=ยุทธศาสตร์และสารสนเทศ').first()
    ).toBeVisible();

    // 6. Navigate to Development -> Community Enterprises
    await page.click('text=กลุ่มส่งเสริมและพัฒนาเกษตรกร');
    await page.click('text=วิสาหกิจชุมชน');
    await expect(page.locator('text=วิสาหกิจชุมชน').first()).toBeVisible();

    // 7. Test search in CrudTable
    const searchInput = page.locator('input[placeholder*="ค้นหา"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test');
      await page.keyboard.press('Enter');
      // Wait for table update (skeleton or data)
    }
  });

  test('should navigate public routes', async ({ page }) => {
    await page.goto('/public/large-plots');
    await expect(page.locator('text=ข้อมูลแปลงใหญ่').first()).toBeVisible();

    await page.goto('/public/smart-farmers');
    await expect(page.locator('text=เกษตรกรรุ่นใหม่').first()).toBeVisible();
  });
});
