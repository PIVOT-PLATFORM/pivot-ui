/**
 * E2E specs — EN17.10: real `@pivot-platform/collaboratif-ui` module wired to `/whiteboard`.
 *
 * Complements `e2e/modules/module-guard.spec.ts` (generic moduleGuard mechanism, still exercised
 * on `/whiteboard` for the disabled-module and interstitial-loading cases — unchanged by this
 * Enabler). This file covers the happy path specific to EN17.10: the real whiteboard module
 * renders (`.board-list`), not `ComingSoonComponent` (`.coming-soon`) and not a blank page.
 *
 * Error case ("Error case: given @pivot-platform/collaboratif-ui indisponible ou erreur de
 * chargement dynamique... then un fallback est géré côté shell — pas de page blanche
 * silencieuse") is covered instead by `src/app/app.routes.spec.ts` (`whiteboard route fallback —
 * EN17.10 error case`) as a TestBed + RouterTestingHarness integration test, not here: simulating
 * a failed dynamic `import()` by aborting `**\/*.js` requests turned out unreliable in this
 * Chromium/Playwright combination — ES module dynamic imports were not consistently surfaced
 * through `page.route()` interception (confirmed empirically in real CI runs: zero interceptions
 * logged for the chunk request despite the abort rule, and the module loaded successfully
 * regardless). The TestBed-based test exercises the exact same
 * loadChildren -> reject -> .catch() -> real Router activation -> real component render path,
 * using `vi.doMock` to intercept the dynamic import at the module-registry level instead of the
 * network level — reliable, and it runs in the regular unit test suite rather than needing a
 * real browser.
 */
import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';
const COLLABORATIF_API = 'http://localhost:8083/api/collaboratif';
const HOME_URL = '/home';

const AUTH_RESPONSE = {
  accessToken: 'opaque-token-whiteboard-shell-wiring-e2e',
  expiresAt: Date.now() + 3_600_000,
  user: {
    id: 7,
    email: 'dana@pivot.io',
    firstName: 'Dana',
    lastName: 'Board',
    role: 'ROLE_USER',
    emailVerified: true,
    tenantId: 21,
    tenantSlug: 'whiteboard-corp',
  },
};

const EMPTY_BOARD_PAGE = {
  boards: [],
  totalElements: 0,
  totalPages: 0,
  currentPage: 0,
  hasNext: false,
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

/** Empty page — simplest valid response that still proves the real component rendered and called its API. */
async function stubEmptyBoardsPage(page: Page): Promise<void> {
  await page.route(`${COLLABORATIF_API}/whiteboard/boards**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(EMPTY_BOARD_PAGE),
    })
  );
}

/** Navigates in-app (SPA), without a full page reload — see module-guard.spec.ts for why this matters. */
async function navigateInApp(page: Page, path: string): Promise<void> {
  await page.evaluate((target) => {
    history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

test.describe('EN17.10 — /whiteboard wired to the real @pivot-platform/collaboratif-ui module', () => {
  test('module active — the real whiteboard module renders, not the ComingSoon placeholder', async ({ page }) => {
    await stubAuthenticatedSession(page);
    await stubModuleStatus(page, 'whiteboard', true);
    await stubEmptyBoardsPage(page);

    await page.goto(HOME_URL);
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });

    await navigateInApp(page, '/whiteboard');

    await expect(page).toHaveURL(/\/whiteboard/, { timeout: 10_000 });
    // The real module's own root component — never rendered by the shell itself.
    await expect(page.locator('.board-list')).toBeVisible({ timeout: 10_000 });
    // Not the placeholder this route used before EN17.10.
    await expect(page.locator('.coming-soon')).toHaveCount(0);
    // Not the dynamic-import failure fallback either.
    await expect(page.locator('.module-load-error')).toHaveCount(0);
  });
});
