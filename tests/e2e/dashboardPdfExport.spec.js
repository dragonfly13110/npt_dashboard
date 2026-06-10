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
      const originalAppendChild = document.body.appendChild.bind(document.body);
      document.body.appendChild = (node) => {
        const result = originalAppendChild(node);
        if (
          node?.tagName === 'IFRAME' &&
          node.title === 'dashboard-pdf-report'
        ) {
          node.contentWindow.print = () => {
            window.__dashboardPdfPrintCalled = true;
          };
        }
        return result;
      };
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
