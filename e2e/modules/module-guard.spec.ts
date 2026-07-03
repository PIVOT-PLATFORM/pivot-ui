/**
 * E2E specs — EN03.2 / US03.2.2 : moduleGuard blocks a disabled module's lazy bundle
 *
 * The core structural AC ("bundle du module non chargé si désactivé — lazy-loading
 * respecté") cannot be verified by Vitest, since Vitest never exercises the real
 * Angular Router lazy `import()` machinery — it must be checked at the network level
 * in a real browser. This spec:
 *
 * 1. Authenticates via the stubbed /auth/refresh (see e2e/auth/session-restore.spec.ts
 *    for the same pattern).
 * 2. Stubs GET /api/modules/whiteboard/status to return enabled:false, then navigates
 *    directly to /whiteboard and asserts NO script/document request for the module's
 *    route chunk is ever issued — the guard must reject before the Router resolves
 *    the route's `loadComponent()` dynamic import.
 * 3. Repeats with enabled:true and asserts the chunk IS requested and the route
 *    actually renders.
 */

import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';
const DASHBOARD_URL = '/dashboard';

const AUTH_RESPONSE = {
  accessToken: 'opaque-token-module-guard-e2e',
  expiresAt: Date.now() + 3_600_000,
  user: {
    id: 4,
    email: 'carol@pivot.io',
    firstName: 'Carol',
    lastName: 'Guard',
    role: 'ROLE_USER',
    emailVerified: true,
    tenantId: 12,
    tenantSlug: 'guard-corp',
  },
};

async function stubAuthenticatedSession(page: Page): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(AUTH_RESPONSE),
    })
  );
}

async function stubModuleStatus(page: Page, moduleId: string, enabled: boolean): Promise<void> {
  await page.route(`${API}/modules/${moduleId}/status`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({ enabled }),
    })
  );
}

test.describe('EN03.2 / US03.2.2 — moduleGuard bundle isolation', () => {
  test('disabled module — no script chunk request is issued, user is redirected to /home', async ({
    page,
  }) => {
    await stubAuthenticatedSession(page);
    await stubModuleStatus(page, 'whiteboard', false);

    // Land on an authenticated page first so we have a clean baseline before probing /whiteboard.
    await page.goto(DASHBOARD_URL);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    const scriptRequests: string[] = [];
    page.on('request', (req) => {
      if (req.resourceType() === 'script') scriptRequests.push(req.url());
    });

    await page.goto('/whiteboard');

    // Guard denies → redirected to /home, never actually rendering the module route.
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });

    // No request whose URL contains "coming-soon" was ever issued — the only page
    // component chunks loaded are for /dashboard and /home, never the module's route.
    expect(scriptRequests.some((url) => url.includes('coming-soon'))).toBe(false);

    // Toast is shown and announced via role="alert".
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('enabled module — the route chunk is requested and the placeholder page renders', async ({
    page,
  }) => {
    await stubAuthenticatedSession(page);
    await stubModuleStatus(page, 'whiteboard', true);

    await page.goto(DASHBOARD_URL);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    const scriptRequests: string[] = [];
    page.on('request', (req) => {
      if (req.resourceType() === 'script') scriptRequests.push(req.url());
    });

    await page.goto('/whiteboard');

    // Guard allows → stays on /whiteboard, module placeholder renders.
    await expect(page).toHaveURL(/\/whiteboard/, { timeout: 10_000 });
    await expect(page.locator('.coming-soon')).toBeVisible();

    expect(scriptRequests.some((url) => url.includes('coming-soon'))).toBe(true);
  });

  test('interstitial loading state is shown while the status check is pending', async ({ page }) => {
    await stubAuthenticatedSession(page);

    // Delay the status response to give the interstitial time to appear.
    await page.route(`${API}/modules/whiteboard/status`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ enabled: true }),
      });
    });

    await page.goto(DASHBOARD_URL);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // The overlay (mounted inside ShellComponent) can only be observed while the shell
    // itself stays mounted across the transition — i.e. an in-app (SPA) navigation, not
    // a fresh full-page load (on a cold load, the Router resolves every guard in the
    // whole matched tree, including the parent shell's, before instantiating anything,
    // so the shell — and the overlay it hosts — would not exist yet either). We drive
    // an in-app navigation the same way the browser's back/forward buttons do (pushState
    // + popstate), which Angular's Router picks up without a full page reload.
    await page.evaluate(() => {
      history.pushState({}, '', '/whiteboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await expect(page.getByRole('status')).toBeVisible();
    await expect(page).toHaveURL(/\/whiteboard/, { timeout: 10_000 });
  });
});
