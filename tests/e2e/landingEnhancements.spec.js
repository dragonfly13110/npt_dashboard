import { test, expect } from '@playwright/test';

test.describe('Landing page orientation sections', () => {
  test('shows quick navigation and opens audience popup from the nav', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    await expect(page.getByTestId('landing-nav')).toBeVisible();
    const floatingNav = page.locator('.landing-floating-system-tabs');
    await expect(floatingNav).toHaveClass(/is-hero-docked/);
    const floatingNavBox = await page
      .locator('.landing-floating-system-tabs')
      .boundingBox();
    expect(floatingNavBox.y).toBeGreaterThanOrEqual(0);
    expect(floatingNavBox.y + floatingNavBox.height).toBeLessThanOrEqual(800);
    await page.evaluate(() => window.scrollTo(0, 180));
    await expect(floatingNav).not.toHaveClass(/is-hero-docked/);
    await expect(
      page.getByRole('heading', {
        name: 'ศูนย์ข้อมูลการเกษตรอัจฉริยะ จังหวัดนครปฐม',
      })
    ).toBeVisible();
    await expect(page.getByTestId('landing-search')).toBeVisible();
    await expect(
      page.getByText(
        'ส้มโอหวาน ข้าวสารขาว ลูกสาวงาม ข้าวหลามหวานมัน สนามจันทร์งามล้น พุทธมณฑลคู่ธานี พระปฐมเจดีย์เสียดฟ้า สวยงามตาแม่น้ำท่าจีน'
      )
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'สำรวจฐานข้อมูล' })
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: 'เปิดแผนที่อัจฉริยะ' })
    ).toHaveCount(0);
    await expect(
      page.getByRole('textbox', { name: 'ค้นหาฐานข้อมูลการเกษตร' })
    ).toBeVisible();
    await expect(page.locator('.premium-hero-links')).toHaveCount(0);
    await expect(page.getByTestId('situation-strip')).toBeVisible();
    await expect(page.getByTestId('landing-map')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'ระบบนี้ช่วยใคร' })
    ).toBeVisible();
    await expect(
      page.locator('a[href="https://kasetinfo.netlify.app/"]').first()
    ).toBeVisible();
    await expect(
      page.locator('a[href="https://agrilabcost-ai.vercel.app/"]').first()
    ).toBeVisible();

    await expect(page.getByRole('button', { name: 'สถานะข้อมูล' })).toHaveCount(
      0
    );
    await expect(
      page.getByText('ข้อมูลชุดไหนสด ชุดไหนต้องอ่านประกอบ')
    ).toHaveCount(0);

    await page.getByRole('button', { name: 'ระบบนี้ช่วยใคร' }).click();
    await expect(
      page.getByRole('dialog', { name: 'ระบบนี้ช่วยใคร' })
    ).toBeVisible();
    await expect(
      page.getByText('ผู้บริหารจังหวัดและผู้บริหารสำนักงาน')
    ).toBeVisible();
    await expect(page.getByText('เจ้าหน้าที่กลุ่มงาน')).toBeVisible();
    await expect(
      page.getByText('เกษตรกร ประชาชน และหน่วยงานภายนอก')
    ).toBeVisible();
    await expect(page.getByText('ผู้ดูแลข้อมูลและผู้ดูแลระบบ')).toBeVisible();
  });
});
