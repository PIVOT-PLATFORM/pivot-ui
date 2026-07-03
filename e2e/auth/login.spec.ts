/**
 * E2E specs — US-AUTH-002 : Login / Remember Me / Logout
 *
 * Architecture note:
 * - Access token is in-memory only (never in localStorage/cookie client-side).
 * - The httpOnly session cookie (pivot_session) is set by the backend.
 * - APP_INITIALIZER calls POST /auth/refresh on every page load to restore
 *   the in-memory token from the session cookie.
 *
 * Strategy:
 * - We intercept backend API calls with page.route() so tests run without
 *   a real backend.
 * - "pivot_session" cookie presence is asserted via Playwright's context cookie API.
 *   Because the cookie is httpOnly (server-side), we inject a synthetic one in
 *   tests that verify its presence, and omit it where we verify its absence.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API = 'http://localhost:8080/api';
const LOGIN_URL = '/auth/login';
const DASHBOARD_URL = '/dashboard';
const SESSION_COOKIE = 'pivot_session';

const VALID_CREDENTIALS = { email: 'user@pivot.io', password: 'Str0ng!Pass' };
const WRONG_CREDENTIALS = { email: 'user@pivot.io', password: 'wrong-pass' };

/** Minimal AuthResponse the backend would return on successful login. */
const AUTH_RESPONSE = {
  accessToken: 'opaque-token-abc123',
  expiresAt: Date.now() + 3_600_000,
  user: {
    id: 1,
    email: 'user@pivot.io',
    firstName: 'Alice',
    lastName: 'Dupont',
    role: 'USER',
    emailVerified: true,
    tenantId: 42,
    tenantSlug: 'acme',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Stubs POST /auth/refresh to return 401 so the app starts unauthenticated.
 * This prevents APP_INITIALIZER from auto-logging in the user.
 */
async function stubRefreshUnauthorized(page: Page): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"No session"}' })
  );
}

/**
 * Stubs POST /auth/refresh to return a valid session (used for session-restore tests).
 */
async function stubRefreshOk(page: Page): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AUTH_RESPONSE) })
  );
}

/**
 * Stubs POST /auth/login to succeed and injects a synthetic pivot_session cookie
 * so subsequent /auth/refresh calls (on reload) can also be stubbed realistically.
 */
async function stubLoginOk(page: Page, context: BrowserContext): Promise<void> {
  await page.route(`${API}/auth/login`, async (route) => {
    // Simulate the server setting an httpOnly session cookie
    await context.addCookies([
      {
        name: SESSION_COOKIE,
        value: 'sess-opaque-xyz',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Strict',
      },
    ]);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(AUTH_RESPONSE),
    });
  });
}

/**
 * Stubs POST /auth/login to succeed with a long-lived cookie (remember me = 30 days).
 */
async function stubLoginRememberMe(page: Page, context: BrowserContext): Promise<void> {
  const thirtyDays = Math.floor((Date.now() + 30 * 24 * 3_600_000) / 1000);
  await page.route(`${API}/auth/login`, async (route) => {
    await context.addCookies([
      {
        name: SESSION_COOKIE,
        value: 'sess-remember-me',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Strict',
        expires: thirtyDays,
      },
    ]);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(AUTH_RESPONSE),
    });
  });
}

/** Stubs POST /auth/login to return 401 Invalid credentials. */
async function stubLoginFailed(page: Page): Promise<void> {
  await page.route(`${API}/auth/login`, (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: '{"message":"Invalid credentials"}',
    })
  );
}

/** Stubs POST /auth/logout to succeed and clears the session cookie. */
async function stubLogout(page: Page, context: BrowserContext): Promise<void> {
  await page.route(`${API}/auth/logout`, async (route) => {
    await context.clearCookies();
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

/**
 * Fills the login form and clicks submit.
 * Returns after the submit button click (does NOT wait for navigation).
 */
async function fillAndSubmitLogin(
  page: Page,
  credentials: { email: string; password: string },
  rememberMe = false
): Promise<void> {
  await page.fill('#email', credentials.email);
  await page.fill('#password', credentials.password);
  if (rememberMe) {
    await page.check('input[formControlName="rememberMe"]');
  }
  await page.click('button[type="submit"]');
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('US-AUTH-002 — Login', () => {
  // Navigate to the login page before every test
  test.beforeEach(async ({ page }) => {
    await stubRefreshUnauthorized(page);
    await page.goto(LOGIN_URL);
    // Wait for the login form to be visible
    await expect(page.locator('#email')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 1. Login nominal
  // -------------------------------------------------------------------------
  test('login nominal — successful login redirects to /home (US01.1.4)', async ({ page, context }) => {
    await stubLoginOk(page, context);
    // Stub refresh for potential subsequent calls
    await page.unroute(`${API}/auth/refresh`);
    await stubRefreshOk(page);

    await fillAndSubmitLogin(page, VALID_CREDENTIALS);

    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });
    // Dashboard shows the user's first name
    await expect(page.locator('h1')).toContainText('Alice');
  });

  // -------------------------------------------------------------------------
  // 2. Login échoué
  // -------------------------------------------------------------------------
  test('login failed — wrong password shows error message', async ({ page }) => {
    await stubLoginFailed(page);

    await fillAndSubmitLogin(page, WRONG_CREDENTIALS);

    // Error alert must be visible and contain translated key fallback
    const alert = page.locator('.alert-error');
    await expect(alert).toBeVisible({ timeout: 5_000 });
    // The app displays the transloco key as-is in dev mode when translations
    // are not loaded, but may also display translated text — either is acceptable.
    await expect(alert).not.toBeEmpty();

    // Must stay on the login page
    await expect(page).toHaveURL(new RegExp(LOGIN_URL));
  });

  // -------------------------------------------------------------------------
  // 3. Remember me coché
  // -------------------------------------------------------------------------
  test('remember me checked — session cookie is set after login', async ({ page, context }) => {
    await stubLoginRememberMe(page, context);

    await page.check('input[formControlName="rememberMe"]');
    await fillAndSubmitLogin(page, VALID_CREDENTIALS, false /* already checked above */);

    // Wait for navigation to confirm login succeeded
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === SESSION_COOKIE);

    expect(sessionCookie).toBeDefined();
    // A "remember me" cookie must have a future expiry (epoch seconds > now)
    expect(sessionCookie!.expires).toBeGreaterThan(Date.now() / 1000);
  });

  // -------------------------------------------------------------------------
  // 4. Remember me décoché
  // -------------------------------------------------------------------------
  test('remember me unchecked — session cookie is set (standard TTL, no expiry)', async ({
    page,
    context,
  }) => {
    await stubLoginOk(page, context);

    // Ensure "remember me" checkbox is NOT checked (default)
    const rememberMeCheckbox = page.locator('input[formControlName="rememberMe"]');
    await expect(rememberMeCheckbox).not.toBeChecked();

    await fillAndSubmitLogin(page, VALID_CREDENTIALS);

    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === SESSION_COOKIE);

    // Cookie is present (session was created by backend)
    expect(sessionCookie).toBeDefined();
    // Session cookie (no remember me) has no persistent expiry (-1 means session cookie)
    expect(sessionCookie!.expires).toBe(-1);
  });

  // -------------------------------------------------------------------------
  // 5. Logout
  // -------------------------------------------------------------------------
  test('logout — redirects to /auth/login and clears session cookie', async ({ page, context }) => {
    // --- Login first ---
    await stubLoginOk(page, context);
    await page.unroute(`${API}/auth/refresh`);
    await stubRefreshOk(page);

    await fillAndSubmitLogin(page, VALID_CREDENTIALS);
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });

    // --- Logout ---
    await stubLogout(page, context);

    // Open user dropdown in the navbar
    await page.locator('.navbar__user').click();
    // Click the sign-out button (`.navbar__dropdown-item--danger` = logout)
    await page.locator('.navbar__dropdown-item--danger').click();

    // Should redirect to the login page
    await expect(page).toHaveURL(new RegExp(LOGIN_URL), { timeout: 10_000 });

    // Session cookie must be gone
    const cookiesAfterLogout = await context.cookies();
    const sessionCookie = cookiesAfterLogout.find((c) => c.name === SESSION_COOKIE);
    expect(sessionCookie).toBeUndefined();
  });
});
