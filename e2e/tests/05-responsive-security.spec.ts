import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

test.describe('Responsiveness & Security Headers', () => {
  test('Renders cleanly without horizontal overflow across Mobile, Tablet, and Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/auth/login');
    await page.getByTestId('login-email').fill('admin@toystore.com');
    await page.getByTestId('login-password').fill('Admin123!');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/dashboard/);

    const routesToCheck = ['/dashboard', '/products', '/users', '/profile'];

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const route of routesToCheck) {
        await page.goto(route);
        await expect(page.locator('main')).toBeVisible();
        await page.waitForTimeout(250);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        expect(overflow, `Horizontal overflow on ${vp.name} at ${route}`).toBeLessThanOrEqual(1);
      }
    }
  });

  test('Mobile navigation drawer opens, meets touch target sizes, and toggles theme', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/auth/login');
    await page.getByTestId('login-email').fill('admin@toystore.com');
    await page.getByTestId('login-password').fill('Admin123!');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/dashboard/);

    const menuBtn = page.getByTestId('mobile-menu-btn');
    await expect(menuBtn).toBeVisible();
    const box = await menuBtn.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);

    await menuBtn.click();
    await expect(page.getByTestId('mobile-drawer')).toHaveClass(/translate-x-0/);
    await page.getByTestId('mobile-menu-close').click();

    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('Nginx production security headers are enforced when running behind Nginx', async ({ request }) => {
    test.skip(process.env['E2E_CHECK_NGINX_HEADERS'] !== 'true', 'Skipped when running directly against Angular dev server');

    const resp = await request.get('/');
    expect(resp.status()).toBe(200);
    const headers = resp.headers();

    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
  });
});
