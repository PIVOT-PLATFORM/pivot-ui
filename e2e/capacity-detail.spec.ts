/**
 * E2E specs — F11 capacity-detail page (Capacity module, `/agilite/capacity/:eventId`).
 *
 * Mirrors `e2e/modules/whiteboard-shell-wiring.spec.ts` / `module-guard.spec.ts`'s pattern: stub
 * the shell's auth refresh + `moduleGuard('agilite')` status check, then stub the capacity
 * feature's own backend calls with an **origin-agnostic** `**` glob (the agilite module calls a
 * same-origin relative `agiliteApiUrl` = `/api/agilite` in this shell — see
 * `agilite-module-loader.ts` — so `page.route()` patterns below never hardcode a host/port).
 * Proves the real `CapacityDetailComponent` renders (tabs + event fields), not a blank page or
 * the `ComingSoonComponent` placeholder, and exercises the Summary tab's engagement gauge
 * over-committed alert (F11.6.6).
 */
import { test, expect, type Page } from '@playwright/test';

const SHELL_API = 'http://localhost:8080/api';
const HOME_URL = '/home';
const EVENT_ID = 'event-1';

const AUTH_RESPONSE = {
  accessToken: 'opaque-token-capacity-detail-e2e',
  expiresAt: Date.now() + 3_600_000,
  user: {
    id: 9,
    email: 'erin@pivot.io',
    firstName: 'Erin',
    lastName: 'Capacity',
    role: 'ROLE_USER',
    emailVerified: true,
    tenantId: 33,
    tenantSlug: 'capacity-corp',
  },
};

const EVENT_RESPONSE = {
  id: EVENT_ID,
  tenantId: 33,
  teamId: 5,
  type: 'SPRINT',
  status: 'ACTIVE',
  name: 'Sprint 42',
  startDate: '2026-07-01',
  endDate: '2026-07-14',
  parentId: null,
  maturityLevel: 'PERFORMING',
  focusFactor: 0.8,
  margeSecurite: 0.1,
  pointsPerDay: 1.2,
  committedPoints: 30,
  completedPoints: null,
  workingDays: [1, 2, 3, 4, 5],
  notes: null,
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

function summaryResponse(overCommitted: boolean) {
  return {
    eventId: EVENT_ID,
    eventType: 'SPRINT',
    eventName: 'Sprint 42',
    totalWorkingDays: 10,
    members: [
      {
        memberId: 'member-1',
        name: 'Ada Lovelace',
        role: 'Dev',
        quotite: 1,
        excluded: false,
        effectiveFocus: 0.8,
        absentWorkingDays: 0,
        workedDays: 10,
        netCapacity: 8,
        points: 8,
        recommendedEngagement: 8,
      },
    ],
    totalNetPersonDays: 10,
    totalNetCapacity: 8,
    totalPoints: overCommitted ? 34 : 8,
    totalRecommendedEngagement: 8,
    loadRatio: 1,
    predictability: 0.9,
    consolidation: null,
    gauge: {
      engagedPoints: overCommitted ? 34 : 8,
      referenceEngagement: 30,
      overflowThreshold: 33,
      engagementRatio: overCommitted ? 1.13 : 0.27,
      overCommitted,
    },
  };
}

async function stubAuthenticatedSession(page: Page): Promise<void> {
  await page.route(`${SHELL_API}/auth/refresh`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AUTH_RESPONSE) })
  );
}

async function stubModuleStatus(page: Page, enabled: boolean): Promise<void> {
  await page.route(`${SHELL_API}/modules/agilite/status`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({ enabled }),
    })
  );
}

/** Stubs the capacity event's `getEvent`/`listChildren`/`getSummary` calls (origin-agnostic). */
async function stubCapacityEvent(page: Page, overCommitted = false): Promise<void> {
  await page.route(`**/api/agilite/capacity/events/${EVENT_ID}`, (route) => {
    if (route.request().method() !== 'GET') {
      return route.fallback();
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EVENT_RESPONSE) });
  });
  await page.route(`**/api/agilite/capacity/events/${EVENT_ID}/children`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );
  await page.route(`**/api/agilite/capacity/events/${EVENT_ID}/summary`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(summaryResponse(overCommitted)),
    })
  );
}

/** Navigates in-app (SPA), without a full page reload — see `module-guard.spec.ts` for why this matters. */
async function navigateInApp(page: Page, path: string): Promise<void> {
  await page.evaluate((target) => {
    history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

test.describe('F11 — capacity-detail page (/agilite/capacity/:eventId)', () => {
  test('renders the real capacity event detail page — tabs, event fields, not a blank page', async ({ page }) => {
    await stubAuthenticatedSession(page);
    await stubModuleStatus(page, true);
    await stubCapacityEvent(page);

    await page.goto(HOME_URL);
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });

    await navigateInApp(page, `/agilite/capacity/${EVENT_ID}`);

    await expect(page).toHaveURL(new RegExp(`/agilite/capacity/${EVENT_ID}`), { timeout: 10_000 });
    await expect(page.locator('.capacity-detail')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.capacity-detail')).toContainText('Sprint 42');
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    await expect(page.locator('.coming-soon')).toHaveCount(0);
  });

  test('switching to the Summary tab shows the engagement gauge, without an over-commit alert', async ({ page }) => {
    await stubAuthenticatedSession(page);
    await stubModuleStatus(page, true);
    await stubCapacityEvent(page, false);

    await page.goto(HOME_URL);
    await navigateInApp(page, `/agilite/capacity/${EVENT_ID}`);
    await expect(page.locator('.capacity-detail')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /Synthèse|Summary/ }).click();

    await expect(page.locator('app-capacity-summary-panel')).toBeVisible();
    await expect(page.locator('[role="alert"]')).toHaveCount(0);
    await expect(page.locator('[role="status"]').last()).toBeVisible();
  });

  test('an over-committed engagement gauge shows the dépassement alert', async ({ page }) => {
    await stubAuthenticatedSession(page);
    await stubModuleStatus(page, true);
    await stubCapacityEvent(page, true);

    await page.goto(HOME_URL);
    await navigateInApp(page, `/agilite/capacity/${EVENT_ID}`);
    await expect(page.locator('.capacity-detail')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /Synthèse|Summary/ }).click();

    const gauge = page.locator('app-capacity-summary-panel [role="alert"]');
    await expect(gauge).toBeVisible();
  });
});
