/**
 * E2E spec — E11 capacity-list page (`agilite-ui`'s `CapacityListComponent`), mounted at
 * `/agilite/capacity`.
 *
 * Mirrors `whiteboard-shell-wiring.spec.ts`'s structure (land on `/home` first for a clean
 * cached baseline, then navigate in-app via `pushState`/`popstate` so the Router picks up the
 * route without a full reload), but stubs routes origin-agnostically (wildcard `/api/...`
 * patterns instead of a hardcoded `http://localhost:PORT/api`) since the capacity feature's backend
 * (`pivot-agilite-core`) isn't started by this repo's own e2e run — every backend call the
 * component makes is stubbed.
 */
import { test, expect, type Page } from '@playwright/test';

const HOME_URL = '/home';
const CAPACITY_URL = '/agilite/capacity';

const AUTH_RESPONSE = {
  accessToken: 'opaque-token-capacity-list-e2e',
  expiresAt: Date.now() + 3_600_000,
  user: {
    id: 9,
    email: 'ellis@pivot.io',
    firstName: 'Ellis',
    lastName: 'Capacity',
    role: 'ROLE_USER',
    emailVerified: true,
    tenantId: 31,
    tenantSlug: 'capacity-corp',
  },
};

const TEAM = { id: 1, name: 'Team Falcon' };

const EVENT = {
  id: 'event-e2e-1',
  tenantId: 31,
  teamId: 1,
  type: 'SPRINT',
  status: 'ACTIVE',
  name: 'Sprint 42',
  startDate: '2026-07-01',
  endDate: '2026-07-14',
  parentId: null,
  maturityLevel: null,
  focusFactor: null,
  margeSecurite: null,
  pointsPerDay: null,
  committedPoints: null,
  completedPoints: null,
  workingDays: [1, 2, 3, 4, 5],
  notes: null,
  createdAt: '2026-06-20T00:00:00Z',
  updatedAt: '2026-06-20T00:00:00Z',
};

const KPI_RESPONSE = {
  teamId: 1,
  eventSampleSize: 3,
  sprintSampleSize: 2,
  kpis: {
    taux_utilisation: 0.82,
    capacite_nette: 45.5,
    velocite_moyenne: 32,
    taux_absence: 0.05,
    depassements: 1,
  },
};

async function stubAuthenticatedSession(page: Page): Promise<void> {
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(AUTH_RESPONSE),
    })
  );
}

async function stubModuleStatus(page: Page, moduleId: string, enabled: boolean): Promise<void> {
  await page.route(`**/api/modules/${moduleId}/status`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({ enabled }),
    })
  );
}

async function stubTeams(page: Page): Promise<void> {
  await page.route('**/api/agilite/teams', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([TEAM]) })
  );
}

async function stubEvents(page: Page, events: unknown[] = [EVENT]): Promise<void> {
  await page.route('**/api/agilite/capacity/events**', (route) => {
    if (route.request().method() !== 'GET') {
      return route.continue();
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(events) });
  });
}

async function stubKpis(page: Page): Promise<void> {
  await page.route('**/api/agilite/kpi**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(KPI_RESPONSE) })
  );
}

/** Navigates in-app (SPA), without a full page reload — see module-guard.spec.ts for why this matters. */
async function navigateInApp(page: Page, path: string): Promise<void> {
  await page.evaluate((target) => {
    history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

test.describe('E11 — /agilite/capacity capacity-list page', () => {
  test('lists the team\'s capacity events and renders the KPI cards', async ({ page }) => {
    await stubAuthenticatedSession(page);
    await stubModuleStatus(page, 'agilite', true);
    await stubTeams(page);
    await stubEvents(page);
    await stubKpis(page);

    await page.goto(HOME_URL);
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });

    await navigateInApp(page, CAPACITY_URL);

    await expect(page).toHaveURL(/\/agilite\/capacity/, { timeout: 10_000 });
    await expect(page.locator('.capacity-list')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.capacity-list__events li')).toHaveCount(1);
    await expect(page.locator('.capacity-list__events li')).toContainText(EVENT.name);
    await expect(page.locator('.capacity-kpi__card')).toHaveCount(5);
  });

  test('shows the empty state when the team has no capacity events', async ({ page }) => {
    await stubAuthenticatedSession(page);
    await stubModuleStatus(page, 'agilite', true);
    await stubTeams(page);
    await stubEvents(page, []);

    await page.goto(HOME_URL);
    await navigateInApp(page, CAPACITY_URL);

    await expect(page.locator('.capacity-list')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.capacity-list__events')).toHaveCount(0);
    await expect(page.locator('.capacity-kpi')).toHaveCount(0);
  });

  test('deleting an event opens the confirm dialog and removes it on confirm', async ({ page }) => {
    await stubAuthenticatedSession(page);
    await stubModuleStatus(page, 'agilite', true);
    await stubTeams(page);
    await stubKpis(page);

    let deleted = false;
    await page.route('**/api/agilite/capacity/events**', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(deleted ? [] : [EVENT]),
        });
      }
      return route.continue();
    });
    await page.route(`**/api/agilite/capacity/events/${EVENT.id}`, (route) => {
      if (route.request().method() === 'DELETE') {
        deleted = true;
        return route.fulfill({ status: 204 });
      }
      return route.continue();
    });

    await page.goto(HOME_URL);
    await navigateInApp(page, CAPACITY_URL);

    await expect(page.locator('.capacity-list__events li')).toHaveCount(1, { timeout: 10_000 });
    await page.locator('.capacity-list__events li button').click();
    await expect(page.locator('[role="alertdialog"]')).toBeVisible();

    await page.locator('[role="alertdialog"] button').first().click();
    await expect(page.locator('[role="alertdialog"]')).toHaveCount(0);
    await expect(page.locator('.capacity-list__events')).toHaveCount(0);
  });
});
