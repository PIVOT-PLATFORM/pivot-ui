/**
 * E2E specs — US-AUTH-002 : Security & RGPD
 *
 * Covers:
 * - Rate limit (429) on login → generic error, stays on login page
 * - RGPD: 401 and 403 return the same generic message (no account status disclosure)
 * - Google button disabled when no client ID configured
 * - Guest guard: unauthenticated access to protected route redirects to login
 */

import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';
const LOGIN_URL = '/auth/login';
const DASHBOARD_URL = '/dashboard';

async function stubRefreshUnauthorized(page: Page): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"No session"}' })
  );
}

async function gotoLogin(page: Page): Promise<void> {
  await stubRefreshUnauthorized(page);
  await page.goto(LOGIN_URL);
  await expect(page.locator('#email')).toBeVisible();
}

async function fillAndSubmit(page: Page, email = 'user@pivot.io', password = 'pass'): Promise<void> {
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
}

test.describe('US-AUTH-002 — Security & RGPD', () => {
  // ---------------------------------------------------------------------------
  // Rate limit
  // ---------------------------------------------------------------------------
  test('rate limit 429 — shows error, stays on login page', async ({ page }) => {
    await gotoLogin(page);
    await page.route(`${API}/auth/login`, (route) =>
      route.fulfill({ status: 429, contentType: 'application/json', body: '{"message":"Too many attempts"}' })
    );

    await fillAndSubmit(page);

    const err = page.locator('.alert-error');
    await expect(err).toBeVisible({ timeout: 5_000 });
    await expect(err).not.toBeEmpty();
    await expect(page).toHaveURL(new RegExp(LOGIN_URL));
  });

  // ---------------------------------------------------------------------------
  // RGPD — erreur générique (401 vs 403 même message)
  // ---------------------------------------------------------------------------
  test('RGPD 401 — same generic error, no "account does not exist" disclosure', async ({ page }) => {
    await gotoLogin(page);
    await page.route(`${API}/auth/login`, (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Invalid credentials"}' })
    );

    await fillAndSubmit(page);

    const err = page.locator('.alert-error');
    await expect(err).toBeVisible({ timeout: 5_000 });
    // Must NOT contain "account" / "blocked" / "disabled" / "compte" / "bloqué"
    const text = (await err.textContent()) ?? '';
    expect(text.toLowerCase()).not.toMatch(/block|disab|bloqué|désactiv|exist/);
  });

  test('RGPD 403 — same generic error as 401, no status disclosure', async ({ page }) => {
    await gotoLogin(page);
    await page.route(`${API}/auth/login`, (route) =>
      route.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"Account disabled"}' })
    );

    await fillAndSubmit(page);

    const err = page.locator('.alert-error');
    await expect(err).toBeVisible({ timeout: 5_000 });
    const text401 = await page.locator('.alert-error').textContent();

    // Now test 401 — text must be identical
    await page.unroute(`${API}/auth/login`);
    await page.route(`${API}/auth/login`, (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Invalid credentials"}' })
    );
    await page.locator('#password').clear();
    await page.fill('#password', 'other-pass');
    await page.click('button[type="submit"]');
    await expect(page.locator('.alert-error')).toBeVisible({ timeout: 5_000 });
    const text403 = await page.locator('.alert-error').textContent();

    expect(text401).toBe(text403);
  });

  // ---------------------------------------------------------------------------
  // Google button disabled
  // ---------------------------------------------------------------------------
  test('Google button is disabled when no GOOGLE_CLIENT_ID is set', async ({ page }) => {
    await gotoLogin(page);
    // In the test environment, window.__PIVOT_GOOGLE_CLIENT_ID is not set
    const googleBtn = page.locator('.google-btn');
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toBeDisabled();
  });

  // ---------------------------------------------------------------------------
  // Auth guard
  // ---------------------------------------------------------------------------
  test('unauthenticated user accessing /dashboard is redirected to /auth/login', async ({ page }) => {
    await stubRefreshUnauthorized(page);
    await page.goto(DASHBOARD_URL);
    await expect(page).toHaveURL(new RegExp(LOGIN_URL), { timeout: 8_000 });
    await expect(page.locator('#email')).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Lang switcher
  // ---------------------------------------------------------------------------
  test('language switcher switches from FR to EN and updates labels', async ({ page }) => {
    await gotoLogin(page);

    // Default: FR active
    const frBtn = page.locator('.lang-btn').filter({ hasText: 'FR' });
    const enBtn = page.locator('.lang-btn').filter({ hasText: 'EN' });
    await expect(frBtn).toHaveClass(/active/);

    // Switch to EN
    await enBtn.click();
    await expect(enBtn).toHaveClass(/active/, { timeout: 3_000 });

    // Page labels must update
    await expect(page.locator('.auth-title')).toContainText('Sign in', { timeout: 3_000 });
  });

  // ---------------------------------------------------------------------------
  // Legal footer links
  // ---------------------------------------------------------------------------
  test('legal footer links are present and navigable', async ({ page }) => {
    await gotoLogin(page);
    const footer = page.locator('.auth-footer-legal');
    await expect(footer).toBeVisible();

    const links = footer.locator('a');
    await expect(links).toHaveCount(3);

    // Each link has a non-empty href
    for (let i = 0; i < 3; i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href).toBeTruthy();
    }
  });
});
