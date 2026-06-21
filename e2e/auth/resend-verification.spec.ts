import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';
const RESEND_URL = '/auth/resend-verification';
const LOGIN_URL = '/auth/login';

async function stubRefreshUnauthorized(page: Page): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"No session"}' })
  );
}

test.describe('US-AUTH-002 — Resend verification email', () => {
  test.beforeEach(async ({ page }) => {
    await stubRefreshUnauthorized(page);
    await page.goto(RESEND_URL);
    await expect(page.locator('#email')).toBeVisible();
  });

  test('resend — success screen shown after submit (RGPD: no enumeration)', async ({ page }) => {
    await page.route(`${API}/auth/resend-verification`, (route) =>
      route.fulfill({ status: 202, contentType: 'application/json', body: '{}' })
    );

    await page.fill('#email', 'any@pivot.io');
    await page.click('button[type="submit"]');

    // Always shows sent screen regardless of whether email exists
    const sent = page.locator('.success-block, [data-testid="resend-sent"]');
    await expect(sent).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#email')).not.toBeVisible();
  });

  test('resend — 404 still shows success screen (RGPD)', async ({ page }) => {
    await page.route(`${API}/auth/resend-verification`, (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
    );

    await page.fill('#email', 'unknown@pivot.io');
    await page.click('button[type="submit"]');

    const sent = page.locator('.success-block, [data-testid="resend-sent"]');
    await expect(sent).toBeVisible({ timeout: 5_000 });
  });

  test('resend — invalid email blocks submission', async ({ page }) => {
    await page.fill('#email', 'not-an-email');
    await page.locator('#email').blur();
    await expect(page.locator('#email')).toHaveClass(/is-invalid/, { timeout: 3_000 });
  });

  test('resend — back to login link navigates correctly', async ({ page }) => {
    await page.click('a[routerLink="/auth/login"], a[href="/auth/login"]');
    await expect(page).toHaveURL(new RegExp(LOGIN_URL), { timeout: 5_000 });
  });
});
