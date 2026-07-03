/**
 * E2E specs — EN03.2 / US03.2.2 : moduleGuard blocks a disabled module's lazy bundle
 *
 * The core structural AC ("bundle du module non chargé si désactivé — lazy-loading
 * respecté") cannot be verified by Vitest, since Vitest never exercises the real
 * Angular Router lazy `import()` machinery — it must be checked at the network level
 * in a real browser.
 *
 * Strategy: land on `/home` first (full page load — main bundle + shell chunk are
 * fetched once, and cached — that's the noise we want to exclude), then drive an
 * **in-app** navigation to `/whiteboard` the same way the browser's back/forward
 * buttons do (`pushState` + `popstate`), which Angular's Router picks up without a
 * full page reload. From that clean baseline, the ONLY script request that can occur
 * is the module route's own `loadComponent()` chunk:
 *
 * - disabled → guard denies before the Router resolves the dynamic import → redirects
 *   to `/home`, which is already loaded → zero additional script requests.
 * - enabled → guard allows → the Router resolves the dynamic import → exactly one new
 *   script request (the shared `ComingSoonComponent` chunk, not yet loaded this session).
 *
 * This avoids depending on chunk filenames, which are content-hashed in the production
 * build CI actually exercises (`chunk-XXXX.js` — no readable component name in the URL,
 * unlike `ng serve`'s dev-mode naming).
 */

import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';
const HOME_URL = '/home';

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

/** Navigates in-app (SPA), without a full page reload, so already-loaded chunks are not re-requested. */
async function navigateInApp(page: Page, path: string): Promise<void> {
  await page.evaluate((target) => {
    history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

test.describe('EN03.2 / US03.2.2 — moduleGuard bundle isolation', () => {
  test('disabled module — no script chunk request is issued, user is redirected to /home', async ({
    page,
  }) => {
    await stubAuthenticatedSession(page);
    await stubModuleStatus(page, 'whiteboard', false);

    // Land on /home first (full load) — the redirect target below is already cached.
    await page.goto(HOME_URL);
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });

    const scriptRequests: string[] = [];
    page.on('request', (req) => {
      if (req.resourceType() === 'script') scriptRequests.push(req.url());
    });

    await navigateInApp(page, '/whiteboard');

    // Guard denies → redirected back to /home, never actually rendering the module route.
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });
    await expect(page.getByRole('alert')).toBeVisible();

    // No script chunk was ever requested for the denied navigation attempt — the guard
    // rejected before the Router could resolve the route's loadComponent() dynamic import,
    // and the /home redirect target was already loaded (no new chunk needed for it either).
    expect(scriptRequests).toHaveLength(0);
  });

  test('enabled module — exactly one new script chunk is requested and the placeholder page renders', async ({
    page,
  }) => {
    await stubAuthenticatedSession(page);
    await stubModuleStatus(page, 'whiteboard', true);

    await page.goto(HOME_URL);
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });

    const scriptRequests: string[] = [];
    page.on('request', (req) => {
      if (req.resourceType() === 'script') scriptRequests.push(req.url());
    });

    await navigateInApp(page, '/whiteboard');

    // Guard allows → Router resolves loadComponent() → placeholder renders on /whiteboard.
    await expect(page).toHaveURL(/\/whiteboard/, { timeout: 10_000 });
    await expect(page.locator('.coming-soon')).toBeVisible();

    // Exactly one new chunk was fetched — the module route's own bundle (shared
    // ComingSoonComponent chunk), never requested before this specific navigation.
    expect(scriptRequests).toHaveLength(1);
  });

  test('interstitial loading state is shown while the status check is pending', async ({ page }) => {
    await stubAuthenticatedSession(page);

    // Delay the status response to give the interstitial time to appear. Generous delay
    // (well under the 5s default assertion timeout) to stay robust under CI/parallel
    // worker contention, which can stretch wall-clock timing significantly.
    await page.route(`${API}/modules/whiteboard/status`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ enabled: true }),
      });
    });

    await page.goto(HOME_URL);
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });

    // The overlay (mounted inside ShellComponent) can only be observed while the shell
    // itself stays mounted across the transition — i.e. an in-app (SPA) navigation, not
    // a fresh full-page load (on a cold load, the Router resolves every guard in the
    // whole matched tree, including the parent shell's, before instantiating anything,
    // so the shell — and the overlay it hosts — would not exist yet either).
    await navigateInApp(page, '/whiteboard');

    // Scoped to the overlay specifically — /home's empty-state also uses role="status".
    await expect(page.locator('.module-access-overlay[role="status"]')).toBeVisible();
    await expect(page).toHaveURL(/\/whiteboard/, { timeout: 10_000 });
  });
});
