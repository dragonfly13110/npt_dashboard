import { test, expect } from '@playwright/test';

const ROLE_ACCOUNTS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD,
  },
  editor: {
    email: process.env.E2E_EDITOR_EMAIL,
    password: process.env.E2E_EDITOR_PASSWORD,
  },
  district_editor: {
    email: process.env.E2E_DISTRICT_EDITOR_EMAIL,
    password: process.env.E2E_DISTRICT_EDITOR_PASSWORD,
  },
};

async function mockGuestSession(page) {
  await page.route('**/api/guest-session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, role: 'guest' }),
    });
  });
}

async function signIn(page, account) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(account.email);
  await page.locator('input[type="password"]').fill(account.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard(?:$|\/)/);
}

async function expectAllowed(page, path) {
  await page.goto(path);
  await expect(page).toHaveURL(new URL(path, page.url()).toString());
}

async function expectRedirectToDashboard(page, path) {
  await page.goto(path);
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('role access matrix', () => {
  test('guest enters dashboard search and cannot open staff-only routes', async ({
    page,
  }) => {
    await mockGuestSession(page);
    await page.goto('/');

    const search = page.getByTestId('landing-search').locator('input');
    await search.fill('ข้าว');
    await search.press('Enter');
    await page.waitForURL(/\/dashboard\/search\?q=/);

    await expectAllowed(page, '/dashboard/search?q=ข้าว');
    await expectRedirectToDashboard(page, '/dashboard/admin/users');
    await expectRedirectToDashboard(page, '/dashboard/data-requests');
    await expectRedirectToDashboard(page, '/dashboard/chatbot');
  });

  for (const [role, account] of Object.entries(ROLE_ACCOUNTS)) {
    test(`${role} can access its critical routes`, async ({ page }) => {
      test.skip(
        !account.email || !account.password,
        `Set E2E_${role.toUpperCase()}_EMAIL and E2E_${role.toUpperCase()}_PASSWORD to run this role`
      );

      await signIn(page, account);
      await expectAllowed(page, '/dashboard');
      await expectAllowed(page, '/dashboard/search?q=ข้าว');
      await expectAllowed(page, '/dashboard/chatbot');

      if (role === 'admin') {
        await expectAllowed(page, '/dashboard/admin/users');
        await expectAllowed(page, '/dashboard/data-requests');
      } else {
        await expectRedirectToDashboard(page, '/dashboard/admin/users');
        await expectAllowed(page, '/dashboard/data-requests');
      }
    });
  }
});
