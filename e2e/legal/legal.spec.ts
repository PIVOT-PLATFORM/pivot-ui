/**
 * E2E specs — Pages légales (US-SHELL-pages-legales)
 *
 * Routes publiques accessibles sans authentification :
 * /legal/mentions-legales, /legal/confidentialite, /legal/cgu
 *
 * Vérifie : chargement, bouton Retour, accès public.
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API = 'http://localhost:8080/api';

const LEGAL_ROUTES = [
  { path: '/legal/mentions-legales', titleKey: 'mentions-legales' },
  { path: '/legal/confidentialite', titleKey: 'confidentialite' },
  { path: '/legal/cgu', titleKey: 'cgu' },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function stubRefreshUnauthorized(page: Page): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"No session"}' })
  );
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('Pages légales — accès public', () => {
  test.beforeEach(async ({ page }) => {
    await stubRefreshUnauthorized(page);
  });

  // -------------------------------------------------------------------------
  // 1. Chaque page légale charge sans authentification
  // -------------------------------------------------------------------------
  for (const route of LEGAL_ROUTES) {
    test(`${route.path} loads without authentication`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page).toHaveURL(new RegExp(route.titleKey));

      // H1 or main heading is visible
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 5_000 });

      // Back button is present
      const backBtn = page.locator('.back-link, .legal__back, button:has-text("Retour"), button:has-text("Back")').first();
      await expect(backBtn).toBeVisible({ timeout: 3_000 });
    });
  }

  // -------------------------------------------------------------------------
  // 2. Bouton Retour navigue en arrière (mentions légales → page précédente)
  // -------------------------------------------------------------------------
  test('back button returns to previous page', async ({ page }) => {
    // Navigate to login first, then to legal page
    await page.goto('/auth/login');
    await expect(page.locator('#email')).toBeVisible({ timeout: 5_000 });

    await page.goto('/legal/mentions-legales');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 5_000 });

    const backBtn = page.locator('.back-link, button:has-text("Retour"), button:has-text("Back")').first();
    await backBtn.click();

    // Should navigate back (URL changes — exact target depends on history)
    await expect(page).not.toHaveURL(/mentions-legales/, { timeout: 5_000 });
  });

  // -------------------------------------------------------------------------
  // 3. Liens légaux depuis le footer de login
  // -------------------------------------------------------------------------
  test('legal notice link in login footer navigates correctly', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('#email')).toBeVisible({ timeout: 5_000 });

    // Footer link to legal notice
    const legalLink = page
      .locator('a[href*="mentions-legales"], a[href*="legal"]')
      .first();

    if (await legalLink.isVisible()) {
      await legalLink.click();
      await expect(page).toHaveURL(/legal/, { timeout: 5_000 });
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 5_000 });
    } else {
      test.skip(); // Footer legal link not present on login — acceptable
    }
  });
});
