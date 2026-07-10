import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';
const REGISTER_URL = '/auth/register';
const LOGIN_URL = '/auth/login';

const VALID_USER = {
  firstName: 'Alice',
  lastName: 'Dupont',
  email: 'alice@pivot.io',
  password: 'Str0ng!Pass123',
};

async function stubRefreshUnauthorized(page: Page): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"No session"}' })
  );
}

async function stubRegisterOk(page: Page): Promise<void> {
  await page.route(`${API}/auth/register`, (route) =>
    route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Vérifiez votre boîte email pour confirmer votre inscription.' }),
    })
  );
}

async function stubRegisterConflict(page: Page): Promise<void> {
  await page.route(`${API}/auth/register`, (route) =>
    route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Email already registered' }),
    })
  );
}

/** Stubs POST /auth/register to return 429 (rate limited) — a real, user-visible error banner. */
async function stubRegisterRateLimited(page: Page): Promise<void> {
  await page.route(`${API}/auth/register`, (route) =>
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ retryAfterSeconds: 30 }),
    })
  );
}

async function fillRegisterForm(page: Page, user = VALID_USER): Promise<void> {
  await page.fill('#firstName', user.firstName);
  await page.fill('#lastName', user.lastName);
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);
  // US01.2.4: confirmPassword is required — the submit button stays disabled without it.
  await page.fill('#confirmPassword', user.password);
}

test.describe('US-AUTH-002 — Register', () => {
  test.beforeEach(async ({ page }) => {
    await stubRefreshUnauthorized(page);
    await page.goto(REGISTER_URL);
    await expect(page.locator('#email')).toBeVisible();
  });

  test('register nominal — success screen shown after 202', async ({ page }) => {
    await stubRegisterOk(page);
    await fillRegisterForm(page);
    await page.click('button[type="submit"]');

    // Success state: form disappears, confirmation message appears
    await expect(page.locator('.success-block, .alert-success, [data-testid="register-success"]'))
      .toBeVisible({ timeout: 8_000 });
    // Must stay on register page (no redirect)
    await expect(page).toHaveURL(new RegExp(REGISTER_URL));
  });

  test('register — weak password shows inline validation', async ({ page }) => {
    await page.fill('#firstName', VALID_USER.firstName);
    await page.fill('#email', VALID_USER.email);
    await page.fill('#password', 'weak');
    await page.locator('#password').blur();

    // Password strength indicator or validation error visible
    const strengthEl = page.locator('.password-strength, .strength-bar, .field-error, .is-invalid');
    await expect(strengthEl.first()).toBeVisible({ timeout: 3_000 });
  });

  test('register — invalid email shows field error', async ({ page }) => {
    await page.fill('#email', 'not-an-email');
    await page.locator('#email').blur();
    const emailField = page.locator('#email');
    await expect(emailField).toHaveClass(/is-invalid/, { timeout: 3_000 });
  });

  test('register — rate limited (429) shows an announced error banner (#135)', async ({ page }) => {
    // Unlike 409 (email already exists, RGPD anti-enumeration → neutral success screen),
    // 429 is a real error the user must be told about — the only reachable error() path
    // in this component, and the one issue #135's fix targets.
    await stubRegisterRateLimited(page);
    await fillRegisterForm(page);
    await page.click('button[type="submit"]');

    const alert = page.locator('.alert-error');
    await expect(alert).toBeVisible({ timeout: 5_000 });
    await expect(alert).not.toBeEmpty();
    // WCAG 4.1.3 (#135): error banner must be announced to assistive tech without focus
    await expect(alert).toHaveAttribute('role', 'alert');
    await expect(alert).toHaveAttribute('aria-live', 'assertive');

    // Must stay on register page — account was not created
    await expect(page).toHaveURL(new RegExp(REGISTER_URL));
  });

  test('register — back to login link navigates correctly', async ({ page }) => {
    await page.click('a[routerLink="/auth/login"], a[href="/auth/login"]');
    await expect(page).toHaveURL(new RegExp(LOGIN_URL), { timeout: 5_000 });
  });
});
