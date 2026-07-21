/**
 * Activities panel — template activities and unavailable-activity state (issue #254).
 *
 * Covers what the panel promises for the activities that own no server entity:
 *   1. Retrospective seeds three titled frames, one create at a time — the regression the manual
 *      recette surfaced was titles rotating across frames, because the server does not echo
 *      creates back in send order. A frame from another participant is interleaved to prove it
 *      cannot claim a pending title.
 *   2. Brainstorming seeds one frame and preselects the sticky tool.
 *   3. The poll — the one activity with no implementation — is rendered disabled with a textual
 *      "coming soon" hint and never launches anything.
 *
 * Same mocked-realtime harness as `quiz.spec.ts` ({@link StompMock} over `page.routeWebSocket`),
 * origin-agnostic REST stubs, no real backend.
 */
import { test, expect, type Page } from '@playwright/test';
import { StompMock } from './stomp-mock';

const API = 'http://localhost:8080/api';
const COLLABORATIF_API = '**/api/collaboratif';
const HOME_URL = '/home';
const BOARD_ID = 'board-activities-e2e';
const BOARD_URL = `/whiteboard/${BOARD_ID}`;
const TOPIC = `/topic/whiteboard/${BOARD_ID}`;

const AUTH_RESPONSE = {
  accessToken: 'opaque-token-whiteboard-activities-e2e',
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

function json(route: Parameters<Parameters<Page['route']>[1]>[0], body: unknown): Promise<void> {
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

async function stubBoardApi(page: Page): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AUTH_RESPONSE) }),
  );
  await page.route(`${API}/modules/whiteboard/status`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({ enabled: true }),
    }),
  );
  await page.route(`${COLLABORATIF_API}/whiteboard/boards/${BOARD_ID}`, (route) =>
    json(route, {
      id: BOARD_ID,
      title: 'Board Activities E2E',
      role: 'OWNER',
      description: null,
      coverImage: null,
      maxParticipants: null,
      enabledActivities: [],
    }),
  );
  await page.route(`${COLLABORATIF_API}/whiteboard/boards/${BOARD_ID}/members`, (route) => json(route, []));
  await page.route(`${COLLABORATIF_API}/whiteboard/me`, (route) => json(route, { userId: '7' }));
  for (const which of ['current', 'last']) {
    await page.route(`${COLLABORATIF_API}/whiteboard/boards/${BOARD_ID}/vote/${which}`, (route) =>
      json(route, null),
    );
    await page.route(`${COLLABORATIF_API}/whiteboard/boards/${BOARD_ID}/quiz/${which}`, (route) =>
      json(route, null),
    );
  }
}

/** Payloads the client published for a given action type, in order. */
function sentOf(mock: StompMock, type: string): unknown[] {
  return mock.sent.filter((s) => s.type === type).map((s) => s.data);
}

async function openBoard(page: Page, mock: StompMock): Promise<void> {
  await page.goto(HOME_URL);
  await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });
  await page.evaluate((target) => {
    history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, BOARD_URL);
  await expect(page).toHaveURL(new RegExp(`/whiteboard/${BOARD_ID}`), { timeout: 10_000 });
  await expect.poll(() => mock.hasSubscription(TOPIC), { timeout: 15_000 }).toBe(true);
}

test.describe('Activities panel — template activities (#254)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __PIVOT_E2E_BEARER_TOKEN__?: string }).__PIVOT_E2E_BEARER_TOKEN__ =
        'e2e-activities-token';
    });
    await stubBoardApi(page);
  });

  test('the retrospective seeds its three frames one at a time, each titled on its own echo', async ({
    page,
  }) => {
    const mock = new StompMock();
    await mock.install(page);
    await openBoard(page, mock);

    await page.getByRole('button', { name: 'Activités' }).click();
    await page.locator('button.wb-act__item', { hasText: 'Rétrospective' }).click();

    const expected = [
      { title: 'Ce qui a bien marché', id: 'frame-left' },
      { title: 'À améliorer', id: 'frame-middle' },
      { title: "Plan d'action", id: 'frame-right' },
    ];

    // Serialised: exactly one create is in flight at a time. Acknowledge each in turn, and
    // interleave a frame from *another* participant to prove it cannot steal a pending title.
    for (let i = 0; i < expected.length; i++) {
      await expect.poll(() => sentOf(mock, 'frame:create').length, { timeout: 10_000 }).toBe(i + 1);
      const create = sentOf(mock, 'frame:create')[i] as { posX: number; posY: number };
      expect(Number.isInteger(create.posX)).toBe(true);

      mock.broadcast(BOARD_ID, 'frame:created', {
        id: 'someone-elses-frame',
        boardId: BOARD_ID,
        title: '',
        posX: 9999,
        posY: 9999,
        width: 400,
        height: 300,
        color: '#94A3B8',
        active: false,
        layer: 1,
      });
      mock.broadcast(BOARD_ID, 'frame:created', {
        id: expected[i].id,
        boardId: BOARD_ID,
        title: '',
        posX: create.posX,
        posY: create.posY,
        width: 400,
        height: 300,
        color: '#94A3B8',
        active: false,
        layer: 1,
      });
    }

    await expect.poll(() => sentOf(mock, 'frame:update').length, { timeout: 10_000 }).toBe(3);
    expect(
      sentOf(mock, 'frame:update').map((m) => {
        const u = m as { id: string; title: string };
        return [u.id, u.title];
      }),
    ).toEqual(expected.map((e) => [e.id, e.title]));
  });

  test('brainstorming seeds one frame and preselects the sticky tool', async ({ page }) => {
    const mock = new StompMock();
    await mock.install(page);
    await openBoard(page, mock);

    await page.getByRole('button', { name: 'Activités' }).click();
    await page.locator('button.wb-act__item', { hasText: 'Brainstorming' }).click();

    await expect.poll(() => sentOf(mock, 'frame:create').length, { timeout: 10_000 }).toBe(1);
    // The sticky tool is now the active one, so the facilitator can write straight away.
    await expect(page.getByRole('button', { name: 'Post-it' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('the poll is disabled with a textual hint and launches nothing', async ({ page }) => {
    const mock = new StompMock();
    await mock.install(page);
    await openBoard(page, mock);

    await page.getByRole('button', { name: 'Activités' }).click();
    const poll = page.locator('button.wb-act__item', { hasText: 'Sondage' });

    await expect(poll).toBeDisabled();
    // The unavailable state must be conveyed textually, not by opacity alone (WCAG 1.4.1).
    await expect(poll.locator('.wb-act__soon')).toHaveText('Bientôt disponible');

    await poll.click({ force: true });

    // Panel still open, nothing created.
    await expect(page.locator('.wb-page__panel--activities')).toBeVisible();
    expect(sentOf(mock, 'frame:create')).toHaveLength(0);
  });
});
