/**
 * US-Q1..Q4 (quiz MVP, §7.2 of QUIZ-ACTIVITY-DESIGN.md) — E2E for the whiteboard quiz activity.
 *
 * Covers the five §7.2 scenarios:
 *   1. Facilitator (OWNER): opens the Activities panel → launches the quiz → composes a
 *      question with choices → starts it.
 *   2. Participant (non-OWNER): sees the OPEN question, picks an answer in the radiogroup,
 *      reaches the "answered" state.
 *   3. Reveal: the distribution + correct answer(s) appear on the facilitator console.
 *   4. Stop: the final leaderboard appears.
 *   5. Security (§2.4 masking, the key assertion): before reveal, the correct answer leaks
 *      neither into the participant's DOM nor into the WS/REST traffic they receive — an
 *      explicit assertion that no `correct` field is ever pushed to the participant while the
 *      question is OPEN.
 *
 * Realtime is simulated with {@link StompMock} (`page.routeWebSocket`), which speaks the same
 * STOMP `{ type, data }` envelope contract as the real {@link StompBoardTransport} — there was no
 * pre-existing vote E2E nor any WS mock to reuse (the two existing whiteboard specs stub REST
 * only), so this spec introduces the mechanism. All REST + WS stubs are **origin-agnostic**
 * (`**\/api/collaboratif/...`), never `localhost:8083` (project memory "Collaboratif E2E : API
 * relative").
 *
 * Runs against the served app on :4200 (mocked `chromium` project) — never a real backend.
 */
import { test, expect, type Page } from '@playwright/test';
import { StompMock } from './stomp-mock';

const API = 'http://localhost:8080/api';
// EN53.4 (ADR-030) — the shell configures `collaboratifApiUrl: '/api/collaboratif'`, a relative
// same-origin path proxied by nginx. Match origin-agnostically with a `**\/` glob prefix so the
// stub is valid whatever the served origin (:4200), never a standalone backend host.
const COLLABORATIF_API = '**/api/collaboratif';
const HOME_URL = '/home';
const BOARD_ID = 'board-quiz-e2e';
const BOARD_URL = `/whiteboard/${BOARD_ID}`;
const TOPIC = `/topic/whiteboard/${BOARD_ID}`;

const AUTH_RESPONSE = {
  accessToken: 'opaque-token-whiteboard-quiz-e2e',
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

// ── Quiz wire fixtures (mirror the server DTO shapes, §5.2) ────────────────────────────────────
interface Choice {
  id: string;
  text: string;
  position: number;
  correct?: boolean;
  count?: number;
}
interface Question {
  id: string;
  position: number;
  text: string;
  state: 'OPEN' | 'REVEALED';
  choices: Choice[];
  answeredCount: number;
}
interface Leader {
  userId: string;
  score: number;
  rank: number;
}
interface Session {
  id: string;
  boardId: string;
  status: 'ACTIVE' | 'CLOSED';
  currentQuestionIndex: number | null;
  currentQuestion: Question | null;
  leaderboard: Leader[];
  createdAt: string;
  closedAt: string | null;
}

const Q_TEXT = 'Quelle est la capitale de la France ?';

/** OPEN question as the server broadcasts it to everyone — **masked**: no `correct`, no per-choice `count`. */
function maskedQuestion(answeredCount: number): Question {
  return {
    id: 'q1',
    position: 0,
    text: Q_TEXT,
    state: 'OPEN',
    answeredCount,
    choices: [
      { id: 'c1', text: 'Paris', position: 0 },
      { id: 'c2', text: 'Lyon', position: 1 },
      { id: 'c3', text: 'Marseille', position: 2 },
    ],
  };
}

/** REVEALED question — **demasked**: `correct` + `count` per choice (only after `quiz:reveal`). */
const REVEALED_QUESTION: Question = {
  id: 'q1',
  position: 0,
  text: Q_TEXT,
  state: 'REVEALED',
  answeredCount: 3,
  choices: [
    { id: 'c1', text: 'Paris', position: 0, correct: true, count: 2 },
    { id: 'c2', text: 'Lyon', position: 1, correct: false, count: 1 },
    { id: 'c3', text: 'Marseille', position: 2, correct: false, count: 0 },
  ],
};

const LEADERBOARD: Leader[] = [
  { userId: '7', score: 1, rank: 1 },
  { userId: '8', score: 0, rank: 2 },
];

function startedSession(answeredCount = 0): Session {
  return {
    id: 'quiz-1',
    boardId: BOARD_ID,
    status: 'ACTIVE',
    currentQuestionIndex: 0,
    currentQuestion: maskedQuestion(answeredCount),
    leaderboard: [],
    createdAt: '2026-07-21T10:00:00Z',
    closedAt: null,
  };
}

const REVEALED_SESSION: Session = {
  ...startedSession(3),
  currentQuestion: REVEALED_QUESTION,
  leaderboard: LEADERBOARD,
};

const CLOSED_SESSION: Session = {
  ...startedSession(),
  status: 'CLOSED',
  currentQuestion: null,
  closedAt: '2026-07-21T10:10:00Z',
  leaderboard: LEADERBOARD,
};

// ── Stub helpers ───────────────────────────────────────────────────────────────────────────────
async function stubAuthenticatedSession(page: Page): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AUTH_RESPONSE) }),
  );
}

async function stubModuleStatus(page: Page, moduleId: string, enabled: boolean): Promise<void> {
  await page.route(`${API}/modules/${moduleId}/status`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({ enabled }),
    }),
  );
}

/** JSON 200 helper. */
function json(route: Parameters<Parameters<Page['route']>[1]>[0], body: unknown): Promise<void> {
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

/**
 * Stubs the board REST surface `BoardStore.init()` hits on mount. `role` drives `isOwner`
 * (OWNER → facilitator console; EDITOR/VIEWER → participant overlay). No active quiz at load —
 * the lifecycle is then driven purely over the (mocked) WS.
 */
async function stubBoardApi(page: Page, role: 'OWNER' | 'EDITOR' | 'VIEWER', userId: string): Promise<void> {
  await page.route(`${COLLABORATIF_API}/whiteboard/boards/${BOARD_ID}`, (route) =>
    json(route, {
      id: BOARD_ID,
      title: 'Board Quiz E2E',
      role,
      description: null,
      coverImage: null,
      maxParticipants: null,
      enabledActivities: ['quiz'],
    }),
  );
  await page.route(`${COLLABORATIF_API}/whiteboard/boards/${BOARD_ID}/members`, (route) => json(route, []));
  await page.route(`${COLLABORATIF_API}/whiteboard/me`, (route) => json(route, { userId }));
  // Vote + quiz rehydration endpoints — no session yet (null/200), so nothing is restored.
  for (const which of ['current', 'last']) {
    await page.route(`${COLLABORATIF_API}/whiteboard/boards/${BOARD_ID}/vote/${which}`, (route) =>
      json(route, null),
    );
    await page.route(`${COLLABORATIF_API}/whiteboard/boards/${BOARD_ID}/quiz/${which}`, (route) =>
      json(route, null),
    );
  }
}

/** Navigates in-app (SPA), without a full page reload — mirrors the existing whiteboard specs. */
async function navigateInApp(page: Page, path: string): Promise<void> {
  await page.evaluate((target) => {
    history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

/** Boots the app, lands on the board page, and waits for the STOMP client to subscribe to the topic. */
async function openBoard(page: Page, mock: StompMock): Promise<void> {
  await page.goto(HOME_URL);
  await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });
  await navigateInApp(page, BOARD_URL);
  await expect(page).toHaveURL(new RegExp(`/whiteboard/${BOARD_ID}`), { timeout: 10_000 });
  // Board page mounted → `init()` ran → transport subscribed to the board topic.
  await expect
    .poll(() => mock.hasSubscription(TOPIC), { timeout: 15_000 })
    .toBe(true);
}

test.describe('Quiz activity — whiteboard board (US-Q1..Q4, §7.2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __PIVOT_E2E_BEARER_TOKEN__?: string }).__PIVOT_E2E_BEARER_TOKEN__ =
        'e2e-quiz-token';
    });
    await stubAuthenticatedSession(page);
    await stubModuleStatus(page, 'whiteboard', true);
  });

  test('facilitator composes and launches a quiz, then reveals and stops it (US-Q1/Q3/Q4)', async ({
    page,
  }) => {
    const mock = new StompMock();
    await mock.install(page);
    await stubBoardApi(page, 'OWNER', '7');

    await openBoard(page, mock);

    // ── Scenario 1: open Activities → launch quiz → compose → start ──────────────────────────
    await page.getByRole('button', { name: 'Activités' }).click();
    await expect(page.locator('.wb-page__panel--activities')).toBeVisible();

    // Pick the "Quiz" activity (no data-id in the DOM — the i18n label is the stable handle).
    await page.locator('button.wb-act__item', { hasText: 'Quiz' }).click();

    const dialog = page.locator('.wb-quizcfg[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    // A fresh dialog starts with 1 question + 2 empty choices — fill them.
    await dialog.locator('input.wb-quizcfg__input--question').first().fill(Q_TEXT);
    const choiceInputs = dialog.locator('input.wb-quizcfg__input--choice');
    await choiceInputs.nth(0).fill('Paris');
    await choiceInputs.nth(1).fill('Lyon');
    // Mark the first choice correct (facilitator legitimately authors the answer key).
    await dialog.locator('input[type="checkbox"]').first().check();

    await dialog.getByRole('button', { name: 'Lancer le quiz' }).click();

    // The client published `quiz:start` over the WS with the composed question set.
    await expect.poll(() => mock.sentTypes(), { timeout: 10_000 }).toContain('quiz:start');
    const startFrame = mock.lastSent('quiz:start');
    expect(startFrame?.destination).toBe(`/app/whiteboard/${BOARD_ID}/action`);
    const startData = startFrame?.data as { boardId: string; questions: { text: string }[] };
    expect(startData.boardId).toBe(BOARD_ID);
    expect(startData.questions[0]?.text).toBe(Q_TEXT);

    // Server acknowledges by broadcasting the masked ACTIVE session.
    mock.broadcast(BOARD_ID, 'quiz:session:started', startedSession(0));

    // Facilitator console (results panel) shows the live, still-masked state.
    const console_ = page.locator('.wb-page__panel--quiz');
    await expect(console_).toBeVisible({ timeout: 10_000 });
    await expect(console_.locator('.wb-quiz-results__summary')).toContainText('participant');
    // No distribution while OPEN.
    await expect(console_.locator('.wb-quiz-results__distribution')).toHaveCount(0);

    // A participant answers → server bumps the masked responder count.
    mock.broadcast(BOARD_ID, 'quiz:updated', startedSession(2));
    await expect(console_.locator('.wb-quiz-results__summary')).toContainText('2');

    // ── Scenario 3: reveal ──────────────────────────────────────────────────────────────────
    await console_.getByRole('button', { name: 'Révéler la réponse' }).click();
    await expect.poll(() => mock.sentTypes(), { timeout: 10_000 }).toContain('quiz:reveal');

    mock.broadcast(BOARD_ID, 'quiz:updated', REVEALED_SESSION);

    const distribution = console_.locator('.wb-quiz-results__distribution');
    await expect(distribution).toBeVisible();
    // The correct choice now carries the "Bonne réponse" badge + its count.
    const correctItem = distribution.locator('.wb-quiz-results__item--correct');
    await expect(correctItem).toHaveCount(1);
    await expect(correctItem).toContainText('Paris');
    await expect(correctItem.locator('.wb-quiz-results__correct-badge')).toBeVisible();
    await expect(distribution.locator('.wb-quiz-results__count').first()).toBeVisible();
    // Cumulative leaderboard is shown.
    await expect(console_.locator('.wb-quiz-results__leaderboard')).toBeVisible();

    // ── Scenario 4: stop → final leaderboard ────────────────────────────────────────────────
    await console_.getByRole('button', { name: 'Terminer le quiz' }).click();
    await expect.poll(() => mock.sentTypes(), { timeout: 10_000 }).toContain('quiz:stop');

    mock.broadcast(BOARD_ID, 'quiz:session:closed', CLOSED_SESSION);

    // Active session cleared, last (closed) session drives the panel — final leaderboard stands.
    const leaderboard = console_.locator('.wb-quiz-results__leaderboard');
    await expect(leaderboard).toBeVisible({ timeout: 10_000 });
    await expect(leaderboard.locator('.wb-quiz-results__rank-item')).toHaveCount(LEADERBOARD.length);
    // Quiz is over — no OPEN-state distribution/reveal controls remain.
    await expect(console_.getByRole('button', { name: 'Révéler la réponse' })).toHaveCount(0);
  });

  test('participant answers the current question; the correct answer never leaks before reveal (US-Q2 + §2.4 security)', async ({
    page,
  }) => {
    const mock = new StompMock();
    await mock.install(page);
    await stubBoardApi(page, 'EDITOR', '9');

    // Capture every quiz REST body the participant receives, to scan for leaks.
    const quizRestBodies: string[] = [];
    page.on('response', async (resp) => {
      if (resp.url().includes('/whiteboard/boards/') && resp.url().includes('/quiz/')) {
        try {
          quizRestBodies.push(await resp.text());
        } catch {
          /* body already consumed / unavailable — ignore */
        }
      }
    });

    await openBoard(page, mock);

    // ── Scenario 2: participant sees the OPEN question ──────────────────────────────────────
    mock.broadcast(BOARD_ID, 'quiz:session:started', startedSession(0));

    const overlay = page.locator('.wb-quiz-overlay[role="dialog"]');
    await expect(overlay).toBeVisible({ timeout: 10_000 });
    await expect(overlay.locator('.wb-quiz-overlay__question')).toContainText(Q_TEXT);

    const radiogroup = overlay.locator('[role="radiogroup"]');
    await expect(radiogroup).toBeVisible();
    const radios = radiogroup.locator('[role="radio"]');
    await expect(radios).toHaveCount(3);
    await expect(radios.nth(0)).toContainText('Paris');

    // ── Scenario 5 (key assertion): no `correct` leaks to the participant before reveal ─────
    // (a) Nothing in the WS broadcasts the participant received carries a `correct` flag.
    expect(mock.inboundText()).not.toMatch(/correct/i);
    // (b) Nothing in the quiz REST responses carries it either.
    expect(quizRestBodies.join('\n')).not.toMatch(/correct/i);
    // (c) Nothing in the participant DOM reveals correctness — no reveal-only markers render.
    await expect(page.locator('.wb-quiz-results__correct-badge')).toHaveCount(0);
    await expect(page.locator('.wb-quiz-results__item--correct')).toHaveCount(0);
    // (d) No radio is marked correct/selected before the participant acts.
    await expect(radiogroup.locator('[role="radio"][aria-checked="true"]')).toHaveCount(0);

    // Participant selects "Paris".
    await radios.nth(0).click();

    // The overlay flips to the "answered" state.
    await expect(overlay.locator('.wb-quiz-overlay__status-text')).toContainText('Réponse enregistrée');

    // The client published `quiz:answer` with the chosen choice — and no `correct` in it.
    await expect.poll(() => mock.sentTypes(), { timeout: 10_000 }).toContain('quiz:answer');
    const answer = mock.lastSent('quiz:answer');
    const answerData = answer?.data as { choiceId: string; questionId: string; boardId: string };
    expect(answerData.choiceId).toBe('c1');
    expect(answerData.questionId).toBe('q1');
    expect(answerData.boardId).toBe(BOARD_ID);
    expect(answer?.raw ?? '').not.toMatch(/correct/i);

    // Re-assert after the interaction: still no correct-answer leak anywhere on the wire.
    expect(mock.inboundText()).not.toMatch(/correct/i);
    expect(quizRestBodies.join('\n')).not.toMatch(/correct/i);
  });
});
