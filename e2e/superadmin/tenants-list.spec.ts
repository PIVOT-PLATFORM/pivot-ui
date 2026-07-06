/**
 * E2E specs — US06.2.3 : Super admin liste tous les tenants
 *
 * Vitest already covers the component/service logic exhaustively (loading,
 * empty, error, filters, pagination — see `tenants-list.component.spec.ts` /
 * `tenants.service.spec.ts`), but never exercises the real Angular Router +
 * `superAdminGuard` + lazy `loadComponent()` chain in an actual browser.
 *
 * Covers:
 * 1. Happy path — a ROLE_SUPER_ADMIN user lands on `/superadmin/tenants` and
 *    sees the rendered table (real route resolution + real HTTP round trip,
 *    stubbed at the network layer).
 * 2. Critical error — the RBAC boundary itself: a ROLE_ADMIN (tenant admin,
 *    not super admin) hitting the same URL is redirected to `/home` and the
 *    tenants page/API is never reached. This is the single most
 *    security-critical AC of this US ("Requiert ROLE_SUPER_ADMIN").
 * 3. GET failure — error state + retry, confirming the fallback path renders
 *    end-to-end (not just in the mocked Vitest HttpClient).
 *
 * Strategy identical to e2e/modules/module-guard.spec.ts and
 * e2e/auth/security.spec.ts: API calls are intercepted via page.route() so
 * these specs run without a real backend.
 */

import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';
const TENANTS_URL = '/superadmin/tenants';
const HOME_URL = '/home';

const superAdminAuthResponse = {
  accessToken: 'opaque-token-super-admin-e2e',
  expiresAt: Date.now() + 3_600_000,
  user: {
    id: 1,
    email: 'super-admin@pivot.io',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'ROLE_SUPER_ADMIN',
    emailVerified: true,
    tenantId: 1,
    tenantSlug: 'platform',
  },
};

const tenantAdminAuthResponse = {
  ...superAdminAuthResponse,
  accessToken: 'opaque-token-tenant-admin-e2e',
  user: { ...superAdminAuthResponse.user, id: 2, email: 'admin@acme.io', role: 'ROLE_ADMIN', tenantId: 42, tenantSlug: 'acme' },
};

const tenantsPage = {
  content: [
    {
      id: 1,
      slug: 'acme',
      name: 'Acme Corp',
      plan: 'ENTERPRISE',
      authMode: 'SAAS',
      isActive: true,
      userCount: 12,
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 2,
      slug: 'globex',
      name: 'Globex',
      plan: 'TRIAL',
      authMode: 'HYBRID',
      isActive: false,
      userCount: 0,
      createdAt: '2026-02-01T00:00:00Z',
    },
  ],
  totalElements: 2,
  totalPages: 1,
  number: 0,
  size: 20,
};

/** Stubs POST /auth/refresh so the app boots already authenticated as the given user. */
async function stubAuthenticatedSession(page: Page, authResponse: typeof superAdminAuthResponse): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(authResponse) })
  );
}

test.describe('US06.2.3 — Super admin tenants list', () => {
  test('ROLE_SUPER_ADMIN sees the tenants table rendered with data', async ({ page }) => {
    await stubAuthenticatedSession(page, superAdminAuthResponse);
    await page.route(`${API}/superadmin/tenants*`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tenantsPage) })
    );

    await page.goto(TENANTS_URL);

    await expect(page).toHaveURL(new RegExp(TENANTS_URL));
    await expect(page.getByTestId('tenants-table')).toBeVisible({ timeout: 10_000 });

    const row1 = page.getByTestId('tenant-row-1');
    await expect(row1).toContainText('Acme Corp');
    await expect(row1).toContainText('acme');
    await expect(row1).toContainText('ENTERPRISE');

    const row2 = page.getByTestId('tenant-row-2');
    await expect(row2).toContainText('Globex');
    await expect(page.getByTestId('tenant-status-2')).toContainText(/inactif|inactive/i);
  });

  test('ROLE_ADMIN (tenant admin) is redirected to /home — RBAC boundary, tenants API never reached', async ({
    page,
  }) => {
    await stubAuthenticatedSession(page, tenantAdminAuthResponse);

    let tenantsApiCalled = false;
    await page.route(`${API}/superadmin/tenants*`, (route) => {
      tenantsApiCalled = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tenantsPage) });
    });

    await page.goto(TENANTS_URL);

    // superAdminGuard denies before the route (and its data fetch) ever resolves.
    await expect(page).toHaveURL(new RegExp(HOME_URL), { timeout: 10_000 });
    expect(tenantsApiCalled).toBe(false);
  });

  test('GET failure shows the error state with a retry button, and retry recovers', async ({ page }) => {
    await stubAuthenticatedSession(page, superAdminAuthResponse);

    let failNext = true;
    await page.route(`${API}/superadmin/tenants*`, (route) => {
      if (failNext) {
        failNext = false;
        return route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Server error"}' });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tenantsPage) });
    });

    await page.goto(TENANTS_URL);

    const errorState = page.getByTestId('tenants-error');
    await expect(errorState).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('tenants-retry').click();

    await expect(page.getByTestId('tenants-table')).toBeVisible({ timeout: 10_000 });
    await expect(errorState).not.toBeVisible();
  });
});
