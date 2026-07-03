/**
 * E2E specs — US01.1.5 : Expiration de session (front) + auto-logout
 *
 * Modèle opaque tokens PIVOT : pas de refresh token — le 401 backend est le
 * seul signal d'expiration. Sur 401 hors /auth/, le front purge la session en
 * mémoire, affiche un toast « Session expirée » et redirige vers /auth/login
 * avec un returnUrl relatif interne.
 *
 * Stratégie : /auth/refresh est stubbé pour authentifier l'app au boot, puis
 * un endpoint API métier (/api/contact) est stubbé en 401 pour simuler
 * l'expiration du token opaque en cours de session.
 */

import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';
const CONTACT_URL = '/contact';
const LOGIN_URL = '/auth/login';

const AUTH_RESPONSE = {
  accessToken: 'opaque-token-session-expiry',
  expiresAt: Date.now() + 3_600_000,
  user: {
    id: 5,
    email: 'dave@pivot.io',
    firstName: 'Dave',
    lastName: 'Lopez',
    role: 'USER',
    emailVerified: true,
    tenantId: 1,
    tenantSlug: 'acme',
  },
};

/** Stubs /auth/refresh OK — APP_INITIALIZER authentifie l'app au boot. */
async function stubRefreshOk(page: Page): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AUTH_RESPONSE) })
  );
}

/** Stubs /api/contact en 401 — simule un token opaque expiré côté serveur. */
async function stubContactUnauthorized(page: Page): Promise<void> {
  await page.route(`${API}/contact`, (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Token expired"}' })
  );
}

test.describe('US01.1.5 — Expiration de session + auto-logout', () => {
  // -------------------------------------------------------------------------
  // Happy path : 401 en cours de session → logout + toast + returnUrl
  // -------------------------------------------------------------------------
  test('401 mid-session — logout, toast « Session expirée » and redirect to /auth/login with returnUrl', async ({
    page,
  }) => {
    await stubRefreshOk(page);
    await stubContactUnauthorized(page);

    // Session active — page protégée avec un appel API métier disponible
    await page.goto(CONTACT_URL);
    await expect(page.locator('#contact-email')).toBeVisible({ timeout: 10_000 });

    // Déclenche l'appel API qui répond 401 (token expiré côté serveur)
    await page.fill('#contact-email', 'dave@pivot.io');
    await page.fill('#contact-message', 'Message pendant session expirée');
    await page.click('button[type="submit"]');

    // Auto-logout : redirection /auth/login avec returnUrl relatif interne
    await expect(page).toHaveURL(/\/auth\/login\?returnUrl=%2Fcontact/, { timeout: 10_000 });
    await expect(page.locator('#email')).toBeVisible();

    // Toast d'expiration (role="alert", type warning)
    const toast = page.locator('[data-testid="toast-warning"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Session expirée, veuillez vous reconnecter.');
    await expect(toast).toHaveAttribute('role', 'alert');
  });

  // -------------------------------------------------------------------------
  // Erreur critique : le 401 d'un endpoint /auth/ ne déclenche PAS l'auto-logout
  // -------------------------------------------------------------------------
  test('401 from /auth/ endpoint (bad credentials) does NOT trigger the session-expired flow', async ({
    page,
  }) => {
    // Visiteur anonyme : refresh au boot en 401 (comportement normal)
    await page.route(`${API}/auth/refresh`, (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"No session"}' })
    );
    // Login en échec : 401 métier
    await page.route(`${API}/auth/login`, (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Bad credentials"}' })
    );

    await page.goto(LOGIN_URL);
    await page.fill('#email', 'dave@pivot.io');
    await page.fill('#password', 'wrong-password');
    await page.click('button[type="submit"]');

    // L'erreur reste gérée par le formulaire de login — pas de toast d'expiration
    await expect(page).toHaveURL(new RegExp(LOGIN_URL));
    await expect(page.locator('[data-testid="toast-warning"]')).toHaveCount(0);
  });
});
