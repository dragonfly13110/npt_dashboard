import { test, expect } from '@playwright/test';

test.describe('Fallback and Seeding Pages Smoke Tests', () => {
  test('should login as guest and view seeded pages successfully', async ({
    page,
  }) => {
    test.setTimeout(60000);
    // 1. Visit Landing Page and login as guest
    await page.goto('/');
    await expect(page).toHaveTitle(/ศูนย์ข้อมูลการเกษตรนครปฐม/);

    await page.click('text=เข้าสู่ระบบ');
    await expect(page).toHaveURL(/\/login/);

    await page.click('button:has-text("บุคคลทั่วไป (เข้าชมข้อมูล)")');
    await page.waitForURL(/\/dashboard/);

    // 2. Verify Production Costs Page
    await page.goto('/dashboard/production/production-costs');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=ต้นทุนการผลิต').first()).toBeVisible();
    await expect(page.locator('table')).toContainText('ข้าวนาปี');

    // 3. Verify Agri Tourism Page
    await page.goto('/dashboard/development/agri-tourism');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('text=แหล่งท่องเที่ยวเชิงเกษตร').first()
    ).toBeVisible();
    await expect(page.locator('table')).toContainText(
      'วิสาหกิจชุมชนเกษตรเมืองนครปฐม'
    );

    // 4. Verify Disasters Page
    await page.goto('/dashboard/development/disasters');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=ภัยพิบัติ').first()).toBeVisible();
  });
});
