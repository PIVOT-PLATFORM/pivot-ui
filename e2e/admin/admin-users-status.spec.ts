/**
 * E2E specs — US06.1.4 (Admin désactive un compte) / US06.1.5 (Admin réactive
 * un compte).
 *
 * Vitest already covers the component/service logic exhaustively (mutually
 * exclusive button per status, dialog role/content, optimistic update,
 * rollback, error classification — see `admin-users.component.spec.ts` /
 * `admin-users.service.spec.ts`), but never exercises the real Angular
 * Router + `adminGuard` + lazy `loadComponent()` chain, nor a real button
 * click → confirm-dialog → HTTP round trip in an actual browser.
 *
 * Strategy identical to e2e/superadmin/tenants-list.spec.ts and
 * e2e/modules/module-guard.spec.ts: API calls are intercepted via
 * page.route() so these specs run without a real backend (pivot-core PR
 * #142, the backend counterpart of this US, is still open at the time this
 * spec was written).
 *
 * Covers:
 * 1. Happy path — deactivate then reactivate the same row end-to-end
 *    (confirmation dialog content, PATCH body, badge/button update).
 * 2. Critical error — a failed PATCH (self-deactivation, 403) rolls the
 *    badge back to its previous value and surfaces an error toast, rather
 *    than silently leaving the UI in an inconsistent state.
 */

import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';
const USERS_URL = '/admin/users';

const adminAuthResponse = {
  accessToken: 'opaque-token-admin-users-status-e2e',
  expiresAt: Date.now() + 3_600_000,
  user: {
    id: 1,
    email: 'admin@acme.io',
    firstName: 'Admin',
    lastName: 'Acme',
    role: 'ROLE_ADMIN',
    emailVerified: true,
    tenantId: 42,
    tenantSlug: 'acme',
  },
};

const activeUser = {
  id: 7,
  email: 'bob.durand@acme.io',
  firstName: 'Bob',
  lastName: 'Durand',
  role: 'ROLE_USER',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
};

const usersPage = (content: (typeof activeUser)[]) => ({
  content,
  totalElements: content.length,
  totalPages: 1,
  number: 0,
  size: 20,
});

/** Stubs POST /auth/refresh so the app boots already authenticated as the tenant admin. */
async function stubAuthenticatedSession(page: Page): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminAuthResponse) })
  );
}

test.describe('US06.1.4/US06.1.5 — Admin deactivates / reactivates a user account', () => {
  test('deactivate then reactivate the same row — confirmation content, PATCH body, and badge update end-to-end', async ({
    page,
  }) => {
    await stubAuthenticatedSession(page);
    await page.route(`${API}/admin/users*`, (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(usersPage([activeUser])),
        });
      }
      return route.fallback();
    });

    await page.goto(USERS_URL);
    await expect(page).toHaveURL(new RegExp(USERS_URL));
    await expect(page.getByTestId('user-row-7')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('user-status-7')).toContainText(/actif/i);

    // --- Deactivate ---
    const patchRequests: unknown[] = [];
    await page.route(`${API}/admin/users/7/status`, (route) => {
      patchRequests.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...activeUser, status: 'INACTIVE' }),
      });
    });

    await page.getByTestId('user-status-toggle-7').click();

    const dialog = page.getByTestId('confirm-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'alertdialog');
    await expect(dialog).toContainText('Bob Durand');
    await expect(dialog).toContainText('déconnecté immédiatement');

    await page.getByTestId('confirm-dialog-confirm').click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByTestId('user-status-7')).toContainText(/inactif/i, { timeout: 10_000 });
    expect(patchRequests).toEqual([{ status: 'INACTIVE' }]);

    // Mutual exclusivity: the row's button now offers "Réactiver", not "Désactiver".
    const toggleButton = page.getByTestId('user-status-toggle-7');
    await expect(toggleButton).toContainText(/réactiver/i);

    // --- Reactivate the same row ---
    await page.unroute(`${API}/admin/users/7/status`);
    await page.route(`${API}/admin/users/7/status`, (route) => {
      patchRequests.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...activeUser, status: 'ACTIVE' }),
      });
    });

    await toggleButton.click();

    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toContainText('Bob Durand');

    await page.getByTestId('confirm-dialog-confirm').click();

    await expect(page.getByTestId('user-status-7')).toContainText(/actif/i, { timeout: 10_000 });
    await expect(page.getByTestId('user-status-7')).not.toContainText(/inactif/i);
    expect(patchRequests).toEqual([{ status: 'INACTIVE' }, { status: 'ACTIVE' }]);
  });

  test('a failed deactivation (self-deactivation, 403) rolls the badge back and surfaces an error toast', async ({
    page,
  }) => {
    await stubAuthenticatedSession(page);
    await page.route(`${API}/admin/users*`, (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(usersPage([activeUser])),
        });
      }
      return route.fallback();
    });
    await page.route(`${API}/admin/users/7/status`, (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'SELF_DEACTIVATION' }),
      })
    );

    await page.goto(USERS_URL);
    await expect(page.getByTestId('user-status-7')).toContainText(/actif/i, { timeout: 10_000 });

    await page.getByTestId('user-status-toggle-7').click();
    await page.getByTestId('confirm-dialog-confirm').click();

    // Rolled back — the badge and button both revert to their pre-attempt (ACTIVE) state.
    await expect(page.getByTestId('user-status-7')).toContainText(/actif/i, { timeout: 10_000 });
    await expect(page.getByTestId('user-status-7')).not.toContainText(/inactif/i);
    await expect(page.getByTestId('user-status-toggle-7')).toContainText(/désactiver/i);

    // Error surfaced to the admin rather than failing silently.
    await expect(page.getByTestId('toast-error')).toBeVisible({ timeout: 10_000 });
  });
});
