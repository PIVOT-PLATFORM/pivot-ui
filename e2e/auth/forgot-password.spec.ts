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

  // NOTE (#135 follow-up, not fixed here — out of scope for a test-only PR):
  // ForgotPasswordComponent's `error` signal is never `.set()` anywhere in the component —
  // both the `next` and `error` subscribe callbacks in `submit()` call `sent.set(true)`.
  // Its `role="alert" aria-live="assertive"` banner is therefore correctly attributed but
  // currently unreachable/dead code: no HTTP response (2xx, 4xx, or 5xx) can ever render it.
  // No e2e test can honestly exercise this path without first changing that business logic,
  // which is a separate, pre-existing concern unrelated to the ARIA-attribute fix itself.

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

  test('reset password — token expiré en URL → état Lien expiré sans formulaire (CA#6)', async ({ page }) => {
    await page.route('**/auth/check-reset-token**', (route) =>
      route.fulfill({ status: 400, contentType: 'application/json', body: '{"message":"Token invalide ou expiré"}' })
    );

    await page.goto(`${RESET_URL}?token=expired-token`);

    // check-reset-token 400 → tokenState = 'invalid' → pas de formulaire, lien "nouveau lien" affiché
    await expect(page.locator('a[routerLink="/auth/forgot-password"]')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#newPassword, input[type="password"]')).toHaveCount(0);
  });

  test('reset password — soumission rejetée (race condition token) → état Lien expiré (CA#7)', async ({ page }) => {
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

  test('reset password — server error (500) shows an announced error banner, form stays usable (#135)', async ({ page }) => {
    // Unlike 400 (invalid/expired token → tokenState = 'invalid'), a 5xx is a transient
    // server error — the token itself is still valid, so `error()` is set instead and the
    // form remains on screen. This is the only reachable error() path in this component.
    await page.route('**/auth/check-reset-token**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );
    await page.route(`${API}/auth/reset-password`, (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Internal error"}' })
    );

    await page.goto(`${RESET_URL}?token=valid-token-abc`);
    const pwdInput = page.locator('#newPassword, input[type="password"]').first();
    await expect(pwdInput).toBeVisible({ timeout: 5_000 });

    await pwdInput.fill('NewStr0ng!Pass');
    await page.click('button[type="submit"]');

    const alert = page.locator('.alert-error');
    await expect(alert).toBeVisible({ timeout: 5_000 });
    await expect(alert).not.toBeEmpty();
    // WCAG 4.1.3 (#135): error banner must be announced to assistive tech without focus
    await expect(alert).toHaveAttribute('role', 'alert');
    await expect(alert).toHaveAttribute('aria-live', 'assertive');

    // Token is still valid — the form must remain usable for a retry
    await expect(pwdInput).toBeVisible();
  });
});
