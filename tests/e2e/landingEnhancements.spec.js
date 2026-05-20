import { test, expect } from '@playwright/test';

test.describe('Landing page orientation sections', () => {
  test('shows quick navigation and opens audience popup from the nav', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('navigation', { name: 'เมนูลัดข้อมูล' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'สภาพอากาศและราคา' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'แผนที่และภาพรวม' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ดินและน้ำ' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ระบบนี้ช่วยใคร' })).toBeVisible();
    await expect(page.getByRole('link', { name: /คลังความรู้เกษตร/ })).toHaveAttribute('href', 'https://kasetinfo.netlify.app/');
    await expect(page.getByRole('link', { name: /Crop Cost Lab/ })).toHaveAttribute('href', 'https://agrilabcost-ai.vercel.app/');

    await expect(page.getByRole('button', { name: 'สถานะข้อมูล' })).toHaveCount(0);
    await expect(page.getByText('ข้อมูลชุดไหนสด ชุดไหนต้องอ่านประกอบ')).toHaveCount(0);

    await page.getByRole('button', { name: 'ระบบนี้ช่วยใคร' }).click();
    await expect(page.getByRole('dialog', { name: 'ระบบนี้ช่วยใคร' })).toBeVisible();
    await expect(page.getByText('ผู้บริหารจังหวัดและผู้บริหารสำนักงาน')).toBeVisible();
    await expect(page.getByText('เจ้าหน้าที่กลุ่มงาน')).toBeVisible();
    await expect(page.getByText('เกษตรกร ประชาชน และหน่วยงานภายนอก')).toBeVisible();
    await expect(page.getByText('ผู้ดูแลข้อมูลและผู้ดูแลระบบ')).toBeVisible();
  });
});
