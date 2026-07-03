/**
 * E2E specs — US01.1.4 : Redirection post-login
 *
 * Couverture :
 * 1. Happy path — un utilisateur non authentifié tente /dashboard, est renvoyé
 *    au login, puis est redirigé vers /dashboard après authentification.
 * 2. Open redirect bloqué — un returnUrl externe (https://evil.com) est ignoré
 *    et l'utilisateur atterrit sur /home.
 *
 * Stratégie identique à login.spec.ts : les appels API sont interceptés via
 * page.route() pour s'exécuter sans backend réel.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const API = 'http://localhost:8080/api';
const LOGIN_URL = '/auth/login';
const SESSION_COOKIE = 'pivot_session';

const VALID_CREDENTIALS = { email: 'user@pivot.io', password: 'Str0ng!Pass' };

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

/** Stubs POST /auth/refresh → 401 (l'app démarre non authentifiée). */
async function stubRefreshUnauthorized(page: Page): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"No session"}' })
  );
}

/** Stubs POST /auth/login → 200 + cookie de session synthétique. */
async function stubLoginOk(page: Page, context: BrowserContext): Promise<void> {
  await page.route(`${API}/auth/login`, async (route) => {
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

async function fillAndSubmitLogin(page: Page): Promise<void> {
  await page.fill('#email', VALID_CREDENTIALS.email);
  await page.fill('#password', VALID_CREDENTIALS.password);
  await page.click('button[type="submit"]');
}

test.describe('US01.1.4 — Redirection post-login', () => {
  test.beforeEach(async ({ page }) => {
    await stubRefreshUnauthorized(page);
  });

  // -------------------------------------------------------------------------
  // 1. Happy path — le contexte de navigation est restauré après login
  // -------------------------------------------------------------------------
  test('accès à /dashboard non authentifié → login → redirection vers /dashboard', async ({
    page,
    context,
  }) => {
    await stubLoginOk(page, context);

    // Tentative d'accès à une route protégée sans session
    await page.goto('/dashboard');
    await expect(page).toHaveURL(new RegExp(LOGIN_URL), { timeout: 8_000 });

    await expect(page.locator('#email')).toBeVisible();
    await fillAndSubmitLogin(page);

    // L'URL d'origine est restaurée (session Angular alimentée par le guard)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // 2. Open redirect bloqué — returnUrl externe ignoré → /home
  // -------------------------------------------------------------------------
  test('returnUrl externe (https://evil.com) ignoré → redirection /home', async ({
    page,
    context,
  }) => {
    await stubLoginOk(page, context);

    await page.goto(`${LOGIN_URL}?returnUrl=${encodeURIComponent('https://evil.com')}`);
    await expect(page.locator('#email')).toBeVisible();

    await fillAndSubmitLogin(page);

    // Jamais de sortie du domaine : retombée sur la destination par défaut
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });
    expect(new URL(page.url()).hostname).toBe('localhost');
  });
});
