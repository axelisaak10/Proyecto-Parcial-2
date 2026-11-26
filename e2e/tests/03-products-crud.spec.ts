import { expect, test } from '@playwright/test';

test.describe('Products Full CRUD Flow (UI -> API -> SQLite)', () => {
  test('Admin can create, search, edit, verify persistence, and delete a product', async ({ page }) => {
    const ts = Date.now();
    const sku = `SKU-PW-${ts}`;
    const name = `Playwright Robot Constructor ${ts}`;
    const updatedName = `Playwright Robot Constructor Pro ${ts}`;

    await page.goto('/auth/login');
    await page.getByTestId('login-email').fill('admin@toystore.com');
    await page.getByTestId('login-password').fill('Admin123!');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByTestId('nav-products').click();
    await expect(page).toHaveURL(/\/products/);

    // Create product
    await page.getByTestId('new-product-btn').click();
    await expect(page.getByTestId('product-modal')).toBeVisible();
    await page.getByTestId('product-sku').fill(sku);
    await page.getByTestId('product-category').selectOption('Construcción');
    await page.getByTestId('product-name').fill(name);
    await page.getByTestId('product-price').fill('199.95');
    await page.getByTestId('product-stock').fill('14');
    await page.getByTestId('product-description').fill('Juguete de construcción validado por E2E');
    await page.getByTestId('product-save-btn').click();

    await expect(page.getByTestId('product-modal')).toBeHidden();

    // Search created product
    await page.getByTestId('products-search').fill(sku);
    const productRow = page.locator(`[data-sku="${sku}"]`);
    await expect(productRow).toBeVisible();
    await expect(productRow).toContainText(name);

    // Edit created product
    await productRow.locator('[data-testid^="edit-product-"]').click();
    await expect(page.getByTestId('product-modal')).toBeVisible();
    await page.getByTestId('product-name').fill(updatedName);
    await page.getByTestId('product-price').fill('249.50');
    await page.getByTestId('product-stock').fill('6');
    await page.getByTestId('product-save-btn').click();
    await expect(page.getByTestId('product-modal')).toBeHidden();

    // Reload and verify persistence
    await page.reload();
    await page.getByTestId('products-search').fill(sku);
    await expect(productRow).toBeVisible();
    await expect(productRow).toContainText(updatedName);
    await expect(productRow).toContainText('249.50');
    await expect(productRow).toContainText('6 uds');

    // Delete created product
    await productRow.locator('[data-testid^="delete-product-"]').click();
    await page.getByTestId('confirm-dialog-confirm').click();
    await expect(productRow).toHaveCount(0);
  });
});
