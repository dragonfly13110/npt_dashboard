import { expect, test } from '@playwright/test';

test.describe('Dashboard PDF export', () => {
  test('creates a structured print report and calls print', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('guestMode', 'true');
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle').catch(() => {});

    await page.evaluate(() => {
      window.__dashboardPdfPrintCalled = false;
      Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
        get() {
          const win = this.contentDocument?.defaultView;
          if (win && !win.__printMocked) {
            win.__printMocked = true;
            win.print = () => {
              window.__dashboardPdfPrintCalled = true;
            };
          }
          return win;
        },
        configurable: true,
      });
    });

    await page.getByRole('button', { name: /PDF/ }).click();

    await expect
      .poll(() => page.evaluate(() => window.__dashboardPdfPrintCalled))
      .toBe(true);

    const frameHtml = await page
      .locator('iframe[title="dashboard-pdf-report"]')
      .evaluate((iframe) => iframe.contentDocument.documentElement.outerHTML);

    expect(frameHtml).toContain('<table>');
    expect(frameHtml).toContain('รายงานแดชบอร์ดรวมข้อมูลเกษตรจังหวัดนครปฐม');
    expect(frameHtml).not.toContain('<canvas');
    expect(frameHtml).not.toContain('data:image');
  });
});
