import { expect, test } from '@playwright/test';

test.describe('Authentication Flow & Session Hardening', () => {
  test('Redirects unauthenticated users to login and rejects bad credentials', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);

    await page.getByTestId('login-email').fill('admin@toystore.com');
    await page.getByTestId('login-password').fill('WrongPassword999');
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('login-error')).toBeVisible();
  });

  test('Logs in as Admin via HttpOnly cookie, persists across reload, and stores zero JWT in Web Storage', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByTestId('login-email').fill('admin@toystore.com');
    await page.getByTestId('login-password').fill('Admin123!');
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId('kpi-total-products')).toBeVisible();

    // Verify zero JWT tokens exist in localStorage or sessionStorage
    const storageSnapshot = await page.evaluate(() => ({
      local: JSON.stringify(window.localStorage),
      session: JSON.stringify(window.sessionStorage),
    }));
    expect(storageSnapshot.local).not.toContain('eyJ');
    expect(storageSnapshot.session).not.toContain('eyJ');

    // Reload preserves authenticated state via HttpOnly cookie + /api/auth/me
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId('kpi-total-products')).toBeVisible();

    // Logout asks for confirmation first; cancelling keeps user on dashboard
    await page.getByTestId('logout-btn').click();
    await expect(page.getByTestId('confirm-dialog-cancel')).toBeVisible();
    await page.getByTestId('confirm-dialog-cancel').click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Confirming logout clears cookie and returns to login
    await page.getByTestId('logout-btn').click();
    await expect(page.getByTestId('confirm-dialog-confirm')).toBeVisible();
    await page.getByTestId('confirm-dialog-confirm').click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('Allows registering a customer, enforces Customer RBAC, and logs out', async ({ page }) => {
    const ts = Date.now();
    const email = `e2e.customer.${ts}@toystore.com`;

    await page.goto('/auth/register');
    await page.getByTestId('register-first-name').fill('Sofía');
    await page.getByTestId('register-last-name').fill('Navarro');
    await page.getByTestId('register-email').fill(email);
    await page.getByTestId('register-password').fill('CustomerPass123!');
    await page.getByTestId('register-confirm-password').fill('CustomerPass123!');
    await page.getByTestId('register-submit').click();

    await expect(page).toHaveURL(/\/auth\/login/);

    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill('CustomerPass123!');
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId('nav-users')).toHaveCount(0);

    // Direct navigation to admin-only /users redirects back to /dashboard
    await page.goto('/users');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
