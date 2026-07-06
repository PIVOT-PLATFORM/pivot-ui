/**
 * E2E specs — US06.1.2 : Admin liste les utilisateurs de son tenant
 *
 * Vitest already covers the component/service logic exhaustively (loading,
 * empty, error, filters, pagination — see `admin-users.component.spec.ts` /
 * `admin-users.service.spec.ts`), but never exercises the real Angular Router
 * + `adminGuard` + lazy `loadComponent()` chain in an actual browser.
 *
 * Covers:
 * 1. Happy path — a ROLE_ADMIN user lands on `/admin/users` and sees the
 *    rendered table (real route resolution + real HTTP round trip, stubbed
 *    at the network layer).
 * 2. Critical error — the RBAC boundary itself: a ROLE_USER (non-admin
 *    tenant member) hitting the same URL is redirected to `/home` and the
 *    users page/API is never reached. This is the single most
 *    security-critical AC of this US ("accessible uniquement aux ROLE_ADMIN").
 * 3. GET failure — error state + retry, confirming the fallback path renders
 *    end-to-end (not just in the mocked Vitest HttpClient).
 *
 * Strategy identical to e2e/superadmin/tenants-list.spec.ts and
 * e2e/modules/module-guard.spec.ts: API calls are intercepted via
 * page.route() so these specs run without a real backend.
 */

import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';
const USERS_URL = '/admin/users';
const HOME_URL = '/home';

const tenantAdminAuthResponse = {
  accessToken: 'opaque-token-tenant-admin-e2e',
  expiresAt: Date.now() + 3_600_000,
  user: {
    id: 2,
    email: 'admin@acme.io',
    firstName: 'Admin',
    lastName: 'Acme',
    role: 'ROLE_ADMIN',
    emailVerified: true,
    tenantId: 42,
    tenantSlug: 'acme',
  },
};

const tenantUserAuthResponse = {
  ...tenantAdminAuthResponse,
  accessToken: 'opaque-token-tenant-user-e2e',
  user: { ...tenantAdminAuthResponse.user, id: 3, email: 'bob@acme.io', role: 'ROLE_USER' },
};

const usersPage = {
  content: [
    {
      id: 1,
      email: 'alice@acme.io',
      firstName: 'Alice',
      lastName: 'Martin',
      role: 'ROLE_USER',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 2,
      email: 'bob@acme.io',
      firstName: 'Bob',
      lastName: 'Durand',
      role: 'ROLE_ADMIN',
      status: 'BLOCKED',
      createdAt: '2026-02-01T00:00:00Z',
    },
  ],
  totalElements: 2,
  totalPages: 1,
  number: 0,
  size: 20,
};

/** Stubs POST /auth/refresh so the app boots already authenticated as the given user. */
async function stubAuthenticatedSession(page: Page, authResponse: typeof tenantAdminAuthResponse): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(authResponse) })
  );
}

test.describe('US06.1.2 — Admin users list', () => {
  test('ROLE_ADMIN sees the users table rendered with data', async ({ page }) => {
    await stubAuthenticatedSession(page, tenantAdminAuthResponse);
    await page.route(`${API}/admin/users*`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(usersPage) })
    );

    await page.goto(USERS_URL);

    await expect(page).toHaveURL(new RegExp(USERS_URL));
    await expect(page.getByTestId('admin-users-table')).toBeVisible({ timeout: 10_000 });

    const row1 = page.getByTestId('user-row-1');
    await expect(row1).toContainText('Alice Martin');
    await expect(row1).toContainText('alice@acme.io');

    const row2 = page.getByTestId('user-row-2');
    await expect(row2).toContainText('Bob Durand');
    await expect(page.getByTestId('user-status-2')).toContainText(/bloqu|blocked/i);
  });

  test('ROLE_USER (non-admin) is redirected to /home — RBAC boundary, users API never reached', async ({
    page,
  }) => {
    await stubAuthenticatedSession(page, tenantUserAuthResponse);

    let usersApiCalled = false;
    await page.route(`${API}/admin/users*`, (route) => {
      usersApiCalled = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(usersPage) });
    });

    await page.goto(USERS_URL);

    // adminGuard denies before the route (and its data fetch) ever resolves.
    await expect(page).toHaveURL(new RegExp(HOME_URL), { timeout: 10_000 });
    expect(usersApiCalled).toBe(false);
  });

  test('GET failure shows the error state with a retry button, and retry recovers', async ({ page }) => {
    await stubAuthenticatedSession(page, tenantAdminAuthResponse);

    let failNext = true;
    await page.route(`${API}/admin/users*`, (route) => {
      if (failNext) {
        failNext = false;
        return route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Server error"}' });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(usersPage) });
    });

    await page.goto(USERS_URL);

    const errorState = page.getByTestId('admin-users-error');
    await expect(errorState).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('admin-users-retry').click();

    await expect(page.getByTestId('admin-users-table')).toBeVisible({ timeout: 10_000 });
    await expect(errorState).not.toBeVisible();
  });
});
