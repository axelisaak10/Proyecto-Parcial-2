import { expect, test } from '@playwright/test';

test.describe('Users Full CRUD Flow (Admin)', () => {
  test('Admin can create, search, edit profile, deactivate, verify login block, and reactivate user', async ({
    page,
    request,
  }) => {
    const ts = Date.now();
    const email = `e2e.managed.${ts}@toystore.com`;
    const password = 'ManagedUser123!';

    await page.goto('/auth/login');
    await page.getByTestId('login-email').fill('admin@toystore.com');
    await page.getByTestId('login-password').fill('Admin123!');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByTestId('nav-users').click();
    await expect(page).toHaveURL(/\/users/);

    // Create user
    await page.getByTestId('new-user-btn').click();
    await expect(page.getByTestId('user-create-modal')).toBeVisible();
    await page.getByTestId('user-create-firstname').fill('Lucía');
    await page.getByTestId('user-create-lastname').fill('Vargas');
    await page.getByTestId('user-create-email').fill(email);
    await page.getByTestId('user-create-password').fill(password);
    await page.getByTestId('user-create-submit').click();
    await expect(page.getByTestId('user-create-modal')).toBeHidden();

    // Search user
    await page.getByTestId('users-search').fill(email);
    const userRow = page.locator(`[data-email="${email}"]`);
    await expect(userRow).toBeVisible();
    await expect(userRow).toContainText('Lucía Vargas');

    // Edit profile
    await userRow.locator('[data-testid^="edit-user-"]').click();
    await expect(page.getByTestId('user-edit-modal')).toBeVisible();
    await page.getByTestId('user-edit-city').fill('Guadalajara');
    await page.getByTestId('user-edit-country').fill('México');
    await page.getByTestId('user-edit-submit').click();
    await expect(page.getByTestId('user-edit-modal')).toBeHidden();
    await expect(userRow).toContainText('Guadalajara, México');

    // Deactivate user
    await userRow.locator('[data-testid^="toggle-user-"]').click();
    await page.getByTestId('confirm-dialog-confirm').click();
    await expect(userRow).toContainText('Inactivo');

    // Verify deactivated user cannot log in
    const blockedLogin = await request.post('/api/auth/login', {
      data: { email, password },
    });
    expect(blockedLogin.status()).toBe(403);

    // Reactivate user
    await userRow.locator('[data-testid^="toggle-user-"]').click();
    await page.getByTestId('confirm-dialog-confirm').click();
    await expect(userRow).toContainText('Activo');

    const restoredLogin = await request.post('/api/auth/login', {
      data: { email, password },
    });
    expect(restoredLogin.status()).toBe(200);
  });
});
