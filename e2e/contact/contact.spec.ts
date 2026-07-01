/**
 * E2E specs — Page de contact (US-16-3-1)
 *
 * Route publique : /contact accessible sans authentification.
 * L'API /api/contact est stubbée via page.route().
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API = 'http://localhost:8080/api';
const CONTACT_URL = '/contact';
const LOGIN_URL = '/auth/login';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Prevents APP_INITIALIZER from auto-authenticating. */
async function stubRefreshUnauthorized(page: Page): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"No session"}' })
  );
}

async function stubContactOk(page: Page): Promise<void> {
  await page.route(`${API}/contact`, (route) =>
    route.fulfill({ status: 202, contentType: 'application/json', body: '{}' })
  );
}

async function stubContactError(page: Page): Promise<void> {
  await page.route(`${API}/contact`, (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Internal error"}' })
  );
}

async function fillContactForm(page: Page, email: string, message: string): Promise<void> {
  await page.fill('#contact-email', email);
  await page.fill('#contact-message', message);
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('US-16-3-1 — Page de contact', () => {
  test.beforeEach(async ({ page }) => {
    await stubRefreshUnauthorized(page);
    await page.goto(CONTACT_URL);
  });

  // -------------------------------------------------------------------------
  // 1. Page accessible publiquement
  // -------------------------------------------------------------------------
  test('page loads without authentication', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(CONTACT_URL));
    // Form heading visible
    await expect(page.locator('h1')).toBeVisible();
    // Email and message inputs visible
    await expect(page.locator('#contact-email')).toBeVisible();
    await expect(page.locator('#contact-message')).toBeVisible();
    // Back button visible
    await expect(page.locator('.contact__back')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 2. Validation — champs vides
  // -------------------------------------------------------------------------
  test('empty submit shows validation errors', async ({ page }) => {
    await page.click('button[type="submit"]');

    const emailError = page.locator('#contact-email-error');
    const messageError = page.locator('#contact-message-error');

    await expect(emailError).toBeVisible({ timeout: 3_000 });
    await expect(messageError).toBeVisible({ timeout: 3_000 });

    // Page stays on /contact
    await expect(page).toHaveURL(new RegExp(CONTACT_URL));
  });

  // -------------------------------------------------------------------------
  // 3. Validation — email invalide
  // -------------------------------------------------------------------------
  test('invalid email shows email error', async ({ page }) => {
    await fillContactForm(page, 'not-an-email', 'Hello');
    await page.click('button[type="submit"]');

    const emailError = page.locator('#contact-email-error');
    await expect(emailError).toBeVisible({ timeout: 3_000 });
    // Message error must NOT appear (message is valid)
    await expect(page.locator('#contact-message-error')).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 4. Soumission réussie
  // -------------------------------------------------------------------------
  test('successful submission shows success banner', async ({ page }) => {
    await stubContactOk(page);

    await fillContactForm(page, 'alice@example.com', 'Bonjour, une question !');
    await page.click('button[type="submit"]');

    const success = page.locator('[data-testid="contact-success"]');
    await expect(success).toBeVisible({ timeout: 5_000 });

    // Form is hidden after success
    await expect(page.locator('#contact-email')).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 5. Erreur API
  // -------------------------------------------------------------------------
  test('API error shows error message', async ({ page }) => {
    await stubContactError(page);

    await fillContactForm(page, 'alice@example.com', 'Message test');
    await page.click('button[type="submit"]');

    const errorDiv = page.locator('.contact__error');
    await expect(errorDiv).toBeVisible({ timeout: 5_000 });

    // Form remains visible — user can retry
    await expect(page.locator('#contact-email')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 6. Lien contact depuis la page de login
  // -------------------------------------------------------------------------
  test('contact link on login page navigates to /contact', async ({ page }) => {
    await page.goto(LOGIN_URL);
    // Find the contact link in the auth footer
    const contactLink = page.locator('a[href="/contact"], a[routerlink="/contact"]').first();
    await expect(contactLink).toBeVisible({ timeout: 3_000 });
    await contactLink.click();
    await expect(page).toHaveURL(new RegExp(CONTACT_URL), { timeout: 5_000 });
  });
});
