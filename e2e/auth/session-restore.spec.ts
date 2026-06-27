/**
 * E2E specs — US-AUTH-002 : Session restore on page reload
 *
 * Architecture note:
 * - The Angular app calls POST /auth/refresh in APP_INITIALIZER on every load.
 * - If the httpOnly session cookie is valid, the server returns a fresh
 *   AuthResponse and the user stays authenticated (no redirect to /login).
 * - If the cookie is absent or expired, the server returns 401 and the user
 *   is redirected to /auth/login by the AuthGuard.
 *
 * Strategy:
 * - We control the /auth/refresh stub before each navigation to simulate
 *   "valid session cookie present" vs "no/expired cookie".
 * - The actual httpOnly cookie cannot be set by JavaScript in the browser
 *   (by design), so we rely entirely on the /auth/refresh stub to drive
 *   the authentication state.
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API = 'http://localhost:8080/api';
const LOGIN_URL = '/auth/login';
const DASHBOARD_URL = '/dashboard';

/** Minimal valid AuthResponse. */
const AUTH_RESPONSE = {
  accessToken: 'opaque-token-reload-xyz',
  expiresAt: Date.now() + 3_600_000,
  user: {
    id: 2,
    email: 'bob@pivot.io',
    firstName: 'Bob',
    lastName: 'Martin',
    role: 'ADMIN',
    emailVerified: true,
    tenantId: 10,
    tenantSlug: 'beta-corp',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stubs /auth/refresh to return a valid authenticated session. */
async function stubRefreshOk(page: Page): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(AUTH_RESPONSE),
    })
  );
}

/** Stubs /auth/refresh to return 401 (no valid session / expired cookie). */
async function stubRefreshUnauthorized(page: Page): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: '{"message":"Session expired or not found"}',
    })
  );
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('US-AUTH-002 — Session restore', () => {
  // -------------------------------------------------------------------------
  // 1. Session restore — l'utilisateur reste connecté après un reload
  // -------------------------------------------------------------------------
  test('session restore — authenticated user stays on /dashboard after page reload', async ({
    page,
  }) => {
    // First load: /auth/refresh returns OK → user is authenticated
    await stubRefreshOk(page);
    await page.goto(DASHBOARD_URL);

    // The auth guard lets the user through because APP_INITIALIZER set the token
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
    await expect(page.locator('h1')).toContainText('Bob');

    // Reload the page — /auth/refresh is called again by APP_INITIALIZER
    // Keep the same stub active (route is still in place)
    await page.reload();

    // User must remain on /dashboard, not be kicked to /auth/login
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
    await expect(page.locator('h1')).toContainText('Bob');
  });

  // -------------------------------------------------------------------------
  // 2. Session expirée — redirect vers /auth/login
  // -------------------------------------------------------------------------
  test('session expired — redirect to /auth/login when cookie is missing or expired', async ({
    page,
  }) => {
    // /auth/refresh returns 401 → app clears auth state
    await stubRefreshUnauthorized(page);

    // Try to access a protected route directly
    await page.goto(DASHBOARD_URL);

    // The AuthService clears in-memory token, AuthGuard redirects to login
    await expect(page).toHaveURL(new RegExp(LOGIN_URL), { timeout: 10_000 });
    // Login form must be visible
    await expect(page.locator('#email')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 3. Session expirée après reload (simulation milieu de session)
  // -------------------------------------------------------------------------
  test('mid-session expiry — reload with expired cookie redirects to login', async ({ page }) => {
    // First load: session is valid
    await stubRefreshOk(page);
    await page.goto(DASHBOARD_URL);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // Simulate cookie expiry: replace the /auth/refresh stub before reload
    await page.unroute(`${API}/auth/refresh`);
    await stubRefreshUnauthorized(page);

    // Reload — APP_INITIALIZER now gets 401
    await page.reload();

    // Must be redirected to login
    await expect(page).toHaveURL(new RegExp(LOGIN_URL), { timeout: 10_000 });
    await expect(page.locator('#email')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 4. Session restore — navigation directe vers /auth/login redirige vers dashboard
  // -------------------------------------------------------------------------
  test('authenticated user visiting /auth/login is redirected to /dashboard', async ({ page }) => {
    // Valid session in place
    await stubRefreshOk(page);

    // Navigate to login while already authenticated
    await page.goto(LOGIN_URL);

    // guestGuard redirects authenticated users to /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });
});
