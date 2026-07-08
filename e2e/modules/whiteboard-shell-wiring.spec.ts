/**
 * E2E specs — EN17.10: real `@pivot-platform/collaboratif-ui` module wired to `/whiteboard`.
 *
 * Complements `e2e/modules/module-guard.spec.ts` (generic moduleGuard mechanism, still exercised
 * on `/whiteboard` for the disabled-module and interstitial-loading cases — unchanged by this
 * Enabler). This file covers what's specific to EN17.10:
 *  - happy path: the real whiteboard module renders (`.board-list`), not `ComingSoonComponent`
 *    (`.coming-soon`) and not a blank page.
 *  - error case: `loadChildren()`'s dynamic `import()` failing (network/chunk error) falls back
 *    to `ModuleLoadErrorComponent` (`.module-load-error`) instead of a silent blank page.
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

  test('dynamic import failure (chunk/network error) — falls back to an explicit error page, never a silent blank page', async ({
    page,
  }) => {
    await stubAuthenticatedSession(page);
    await stubModuleStatus(page, 'whiteboard', true);

    await page.goto(HOME_URL);
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });

    // Everything needed for /home is already loaded/cached at this point (see
    // module-guard.spec.ts's navigateInApp rationale) — the only *new* script request an
    // in-app navigation to /whiteboard can still trigger is the module's own dynamic
    // `import()` chunk. Aborting all new script requests from here on deterministically
    // simulates that specific failure (network error / missing chunk) without depending on
    // its content-hashed filename, which isn't predictable from a test.
    await page.route('**/*.js', (route) => route.abort('failed'));

    await navigateInApp(page, '/whiteboard');

    await expect(page.locator('.module-load-error')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('alert')).toBeVisible();
    // Router stays on /whiteboard (the fallback route resolves under it) — not a redirect
    // masking the failure, and not a blank /whiteboard either.
    await expect(page).toHaveURL(/\/whiteboard/, { timeout: 10_000 });
    await expect(page.locator('.board-list')).toHaveCount(0);

    // Explicit recovery affordances, not a dead end.
    await expect(page.locator('.module-load-error__retry')).toBeVisible();
    await expect(page.locator('.module-load-error__back')).toBeVisible();
  });
});
