/**
 * US08.4.1 (addendum) — "Aucun template" (blank) card in the "Nouveau tableau" gallery.
 *
 * Happy path for the explicit blank-creation flow added on top of the template gallery:
 * the blank card is preselected by default when the modal opens, and confirming without
 * touching a template creates a blank board (POST without a `templateId` query param).
 *
 * Backend is fully mocked via `page.route()` (mirrors whiteboard-shell-wiring.spec.ts) —
 * this suite runs against the served app on :4200, never a real backend. The deeper
 * selection/keyboard behavior is covered by the template-gallery Vitest unit spec; this
 * E2E only proves the default-blank creation wiring end-to-end through the real modal.
 */
import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';
const COLLABORATIF_API = 'http://localhost:8083/api/collaboratif';
const HOME_URL = '/home';

const AUTH_RESPONSE = {
  accessToken: 'opaque-token-whiteboard-blank-template-e2e',
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

const TEMPLATES = [
  { id: 'tpl-brainstorm', code: 'BRAINSTORM', thumbnailUrl: 'https://cdn.example.com/brainstorm.png' },
  { id: 'tpl-retro', code: 'RETROSPECTIVE', thumbnailUrl: 'https://cdn.example.com/retro.png' },
];

const CREATED_BOARD = { id: 'board-blank-42', title: 'Mon tableau vierge' };

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

async function stubTemplateCatalog(page: Page): Promise<void> {
  await page.route(`${COLLABORATIF_API}/whiteboard/templates`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TEMPLATES),
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

test.describe('US08.4.1 — blank ("Aucun template") default creation flow', () => {
  test('opening the modal preselects the blank card; confirming creates a board without a templateId', async ({
    page,
  }) => {
    await stubAuthenticatedSession(page);
    await stubModuleStatus(page, 'whiteboard', true);
    await stubTemplateCatalog(page);

    // Board list load (GET) + board creation (POST) share the same path — branch on method.
    // Capturing the POST URL lets us assert no `templateId` query param is sent for a blank board.
    let createUrl: string | null = null;
    await page.route(`${COLLABORATIF_API}/whiteboard/boards**`, (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        createUrl = request.url();
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(CREATED_BOARD),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(EMPTY_BOARD_PAGE),
      });
    });

    await page.goto(HOME_URL);
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });

    await navigateInApp(page, '/whiteboard');
    await expect(page.locator('.board-list')).toBeVisible({ timeout: 10_000 });

    // Open the "Nouveau tableau" modal.
    await page.locator('button.board-list__create-btn').click();
    await expect(page.locator('.board-list__modal-overlay[role="dialog"]')).toBeVisible();

    // The blank card is present, first, and preselected without any interaction.
    const blankCard = page.locator('button.template-gallery__card--blank');
    await expect(blankCard).toBeVisible({ timeout: 10_000 });
    await expect(blankCard).toHaveAttribute('aria-selected', 'true');
    await expect(blankCard).toContainText('Aucun template');

    // Fill the title and confirm — no template touched, so the blank default stands.
    await page.locator('#board-title-input').fill('Mon tableau vierge');
    await page.locator('button.board-list__modal-btn--confirm').click();

    // Board created and navigation to the new board.
    await expect(page).toHaveURL(new RegExp(`/whiteboard/${CREATED_BOARD.id}`), { timeout: 10_000 });
    expect(createUrl).not.toBeNull();
    expect(createUrl).not.toContain('templateId');
  });
});
