/**
 * E2E specs — E11 Capacity, capacity-form (create/edit event + PI cadence generation).
 *
 * Vitest already covers the component logic exhaustively (create/edit prefill, client
 * validation, server-error code mapping, cadence generation — see
 * `capacity-form.component.spec.ts`), but never exercises the real Angular Router + moduleGuard
 * + lazy `loadComponent()` chain, or a real `<form>` submit, in an actual browser.
 *
 * The capacity API calls are stubbed with origin-agnostic `page.route()` globs
 * (`**\/api/agilite/capacity/**`) rather than a hardcoded host: unlike the whiteboard/collaboratif
 * module (a separate absolute origin in some environments), `agiliteApiUrl` is a same-origin
 * relative path (`/api/agilite`, see `src/environments/environment.ts`) — nginx routes it to the
 * modulith from whichever origin the app itself is served from.
 */
import { test, expect, type Page } from '@playwright/test';

const AUTH_API = 'http://localhost:8080/api';
const HOME_URL = '/home';

const AUTH_RESPONSE = {
  accessToken: 'opaque-token-capacity-form-e2e',
  expiresAt: Date.now() + 3_600_000,
  user: {
    id: 9,
    email: 'priya@pivot.io',
    firstName: 'Priya',
    lastName: 'Planner',
    role: 'ROLE_USER',
    emailVerified: true,
    tenantId: 30,
    tenantSlug: 'capacity-corp',
  },
};

const PI_EVENT = {
  id: 'e-1',
  tenantId: 30,
  teamId: 1,
  type: 'PI_PLANNING',
  status: 'PLANNING',
  name: 'PI 2026.3',
  startDate: '2026-07-01',
  endDate: '2026-09-30',
  parentId: null,
  maturityLevel: 'NORMING',
  focusFactor: 0.7,
  margeSecurite: 0.1,
  pointsPerDay: null,
  committedPoints: null,
  completedPoints: null,
  workingDays: [1, 2, 3, 4, 5],
  notes: null,
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};

async function stubAuthenticatedSession(page: Page): Promise<void> {
  await page.route(`${AUTH_API}/auth/refresh`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AUTH_RESPONSE) })
  );
}

async function stubAgiliteModuleEnabled(page: Page): Promise<void> {
  await page.route(`${AUTH_API}/modules/agilite/status`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({ enabled: true }),
    })
  );
}

async function stubEmptyParentCandidates(page: Page): Promise<void> {
  await page.route('**/api/agilite/capacity/events?**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );
}

test.describe('E11 Capacity — capacity-form', () => {
  test('create — filling and submitting the form POSTs the event and leaves the create route', async ({ page }) => {
    await stubAuthenticatedSession(page);
    await stubAgiliteModuleEnabled(page);
    await stubEmptyParentCandidates(page);

    await page.route('**/api/agilite/capacity/events', (route) => {
      if (route.request().method() !== 'POST') {
        return route.fallback();
      }
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ...PI_EVENT, id: 'e-2', type: 'SPRINT', name: 'Sprint 1' }),
      });
    });

    await page.goto(HOME_URL);
    await expect(page).toHaveURL(new RegExp(HOME_URL), { timeout: 10_000 });

    await page.goto('/agilite/capacity/new?teamId=1');
    await expect(page.locator('#capacity-type')).toBeVisible({ timeout: 10_000 });

    await page.locator('#capacity-type').selectOption('SPRINT');
    await page.locator('#capacity-name').fill('Sprint 1');
    await page.locator('#capacity-start-date').fill('2026-07-01');
    await page.locator('#capacity-end-date').fill('2026-07-14');
    await page.getByRole('button', { name: /enregistrer|save/i }).click();

    // A successful create navigates away from the create route (to the new event's detail page).
    await expect(page).not.toHaveURL(/\/capacity\/new/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/capacity\/e-2/);
  });

  test('create — an invalid date range is rejected client-side, no request is sent', async ({ page }) => {
    await stubAuthenticatedSession(page);
    await stubAgiliteModuleEnabled(page);
    await stubEmptyParentCandidates(page);

    let posted = false;
    await page.route('**/api/agilite/capacity/events', (route) => {
      if (route.request().method() === 'POST') {
        posted = true;
      }
      return route.fallback();
    });

    await page.goto(HOME_URL);
    await expect(page).toHaveURL(new RegExp(HOME_URL), { timeout: 10_000 });

    await page.goto('/agilite/capacity/new?teamId=1');
    await expect(page.locator('#capacity-type')).toBeVisible({ timeout: 10_000 });

    await page.locator('#capacity-type').selectOption('SPRINT');
    await page.locator('#capacity-name').fill('Sprint 1');
    await page.locator('#capacity-start-date').fill('2026-07-14');
    await page.locator('#capacity-end-date').fill('2026-07-01');
    await page.getByRole('button', { name: /enregistrer|save/i }).click();

    await expect(page.locator('.capacity-form__error--submit')).toBeVisible({ timeout: 10_000 });
    expect(posted).toBe(false);
  });

  test('edit — loads and prefills an existing PI event, and shows the cadence section', async ({ page }) => {
    await stubAuthenticatedSession(page);
    await stubAgiliteModuleEnabled(page);
    await stubEmptyParentCandidates(page);

    await page.route('**/api/agilite/capacity/events/e-1', (route) => {
      if (route.request().method() !== 'GET') {
        return route.fallback();
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PI_EVENT) });
    });

    await page.goto(HOME_URL);
    await expect(page).toHaveURL(new RegExp(HOME_URL), { timeout: 10_000 });

    await page.goto('/agilite/capacity/e-1/edit');
    await expect(page.locator('#capacity-name')).toHaveValue('PI 2026.3', { timeout: 10_000 });
    await expect(page.locator('#capacity-type')).toHaveValue('PI_PLANNING');

    await expect(page.locator('#capacity-cadence-title')).toBeVisible();
  });

  test('edit — generating a cadence posts the sub-form and shows the generated sprints', async ({ page }) => {
    await stubAuthenticatedSession(page);
    await stubAgiliteModuleEnabled(page);
    await stubEmptyParentCandidates(page);

    await page.route('**/api/agilite/capacity/events/e-1', (route) => {
      if (route.request().method() !== 'GET') {
        return route.fallback();
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PI_EVENT) });
    });
    await page.route('**/api/agilite/capacity/events/e-1/cadence', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 's-1', status: 'PLANNING', name: 'Sprint 1', startDate: '2026-07-01', endDate: '2026-07-14', ipSprint: false },
        ]),
      })
    );

    await page.goto(HOME_URL);
    await expect(page).toHaveURL(new RegExp(HOME_URL), { timeout: 10_000 });

    await page.goto('/agilite/capacity/e-1/edit');
    await expect(page.locator('#capacity-cadence-title')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /générer les sprints|generate sprints/i }).click();

    await expect(page.locator('.capacity-form__cadence-result')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.capacity-form__cadence-result')).toContainText('Sprint 1');
  });

  test('edit — a mapped server error code on save shows the translated inline message', async ({ page }) => {
    await stubAuthenticatedSession(page);
    await stubAgiliteModuleEnabled(page);
    await stubEmptyParentCandidates(page);

    await page.route('**/api/agilite/capacity/events/e-1', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PI_EVENT) });
      }
      if (route.request().method() === 'PUT') {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ title: 'Validation failed', code: 'INVALID_FOCUS_FACTOR' }),
        });
      }
      return route.fallback();
    });

    await page.goto(HOME_URL);
    await expect(page).toHaveURL(new RegExp(HOME_URL), { timeout: 10_000 });

    await page.goto('/agilite/capacity/e-1/edit');
    await expect(page.locator('#capacity-name')).toHaveValue('PI 2026.3', { timeout: 10_000 });

    await page.getByRole('button', { name: /enregistrer|save/i }).click();

    await expect(page.locator('.capacity-form__error--submit')).toBeVisible({ timeout: 10_000 });
  });
});
