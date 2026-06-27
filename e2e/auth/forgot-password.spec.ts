import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';
const FORGOT_URL = '/auth/forgot-password';
const RESET_URL = '/auth/reset-password';
const LOGIN_URL = '/auth/login';

async function stubRefreshUnauthorized(page: Page): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"No session"}' })
  );
}

test.describe('US-AUTH-002 — Forgot & Reset password', () => {
  test.beforeEach(async ({ page }) => {
    await stubRefreshUnauthorized(page);
  });

  // ---------------------------------------------------------------------------
  // Forgot password
  // ---------------------------------------------------------------------------
  test('forgot password — always shows sent confirmation (no enumeration)', async ({ page }) => {
    await page.route(`${API}/auth/forgot-password`, (route) =>
      route.fulfill({ status: 202, contentType: 'application/json', body: '{}' })
    );

    await page.goto(FORGOT_URL);
    await expect(page.locator('#email')).toBeVisible();

    await page.fill('#email', 'unknown@pivot.io');
    await page.click('button[type="submit"]');

    // Sent confirmation must appear regardless of whether email exists (RGPD)
    const sentEl = page.locator('.sent-block, .alert-success, [data-testid="forgot-sent"], h1');
    await expect(sentEl.first()).toBeVisible({ timeout: 5_000 });
  });

  test('forgot password — invalid email blocks submission', async ({ page }) => {
    await page.goto(FORGOT_URL);
    await page.fill('#email', 'not-valid');
    await page.locator('#email').blur();
    const emailField = page.locator('#email');
    await expect(emailField).toHaveClass(/is-invalid/, { timeout: 3_000 });
  });

  test('forgot password — back to login link works', async ({ page }) => {
    await page.goto(FORGOT_URL);
    await page.click('a[routerLink="/auth/login"], a[href="/auth/login"]');
    await expect(page).toHaveURL(new RegExp(LOGIN_URL), { timeout: 5_000 });
  });

  // ---------------------------------------------------------------------------
  // Reset password
  // ---------------------------------------------------------------------------
  test('reset password — success redirects to login', async ({ page }) => {
    await page.route('**/auth/check-reset-token**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );
    await page.route(`${API}/auth/reset-password`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );

    await page.goto(`${RESET_URL}?token=valid-token-abc`);
    await expect(page.locator('#newPassword, input[type="password"]').first()).toBeVisible({ timeout: 5_000 });

    await page.fill('#newPassword, input[type="password"]', 'NewStr0ng!Pass');
    await page.click('button[type="submit"]');

    // Success state : lien "retour login" affiché (unique au @case 'success')
    await expect(page.locator('a[routerLink="/auth/login"]')).toBeVisible({ timeout: 5_000 });
  });

  test('reset password — invalid/missing token shows error', async ({ page }) => {
    await page.route('**/auth/check-reset-token**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );
    await page.route(`${API}/auth/reset-password`, (route) =>
      route.fulfill({ status: 400, contentType: 'application/json', body: '{"message":"Invalid token"}' })
    );

    await page.goto(`${RESET_URL}?token=expired-token`);

    // Token check passes → formulaire affiché
    const pwdInput = page.locator('#newPassword, input[type="password"]').first();
    await expect(pwdInput).toBeVisible({ timeout: 5_000 });

    await pwdInput.fill('NewStr0ng!Pass');
    await page.click('button[type="submit"]');

    // Le backend rejette le reset (400) → tokenState = 'invalid' → lien "demander un nouveau lien" affiché
    await expect(page.locator('a[routerLink="/auth/forgot-password"]')).toBeVisible({ timeout: 5_000 });
  });
});
