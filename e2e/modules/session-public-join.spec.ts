/**
 * E2E specs — US19.2.1: `session/join` and `session/:sessionId/play` are genuinely public,
 * reachable by a caller with **no** PIVOT account and **no** authentication cookie/token at all
 * (anonymous `ROLE_GUEST` participation — the entire point of this US).
 *
 * No `stubAuthenticatedSession` anywhere in this file, deliberately — that is the condition under
 * test. Complements `e2e/modules/module-guard.spec.ts` (the generic `moduleGuard` mechanism,
 * unaffected by this fix) and `e2e/modules/whiteboard-shell-wiring.spec.ts` (the real-module-
 * render pattern for the *authenticated* `/session` subtree, `SESSION_ROUTE`).
 *
 * Regression coverage for a real bug: an earlier version of this routing only registered `join`/
 * `:sessionId/play` inside the shell's authenticated route tree (`SESSION_ROUTE`, gated by both
 * `authMatchGuard` and `moduleGuard('session')`) — structurally unreachable by the exact caller
 * US19.2.1 exists to serve. The fix duplicates those two routes, unguarded, as a top-level public
 * fallback (`SESSION_PUBLIC_ROUTE` in `app.routes.ts`), mirroring this codebase's own established
 * pattern for `contact`/`legal`/`account/deletion/cancel`.
 */
import { test, expect, type Page } from '@playwright/test';

// EN53.4 (ADR-030) — the shell configures `collaboratifApiUrl: '/api/collaboratif'`, a relative
// same-origin path proxied by nginx. Requests therefore hit the served origin (:4200), not a
// standalone backend host — so match origin-agnostically with a `**/` glob prefix (mirrors
// `whiteboard-blank-template.spec.ts`).
const COLLABORATIF_API = '**/api/collaboratif';

async function stubGuestJoinAndState(
  page: Page,
  sessionId: string,
  stateBody: Record<string, unknown>,
): Promise<void> {
  await page.route(`${COLLABORATIF_API}/sessions/join`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        participantId: 'p-e2e-1',
        token: 'guest-token-e2e',
        wsTopic: `/topic/collaboratif/session/${sessionId}`,
      }),
    })
  );
  await page.route(`${COLLABORATIF_API}/sessions/${sessionId}/state`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(stateBody),
    })
  );
}

test.describe('US19.2.1 — session/join is public (no account required)', () => {
  test('an anonymous visitor landing directly on /session/join sees the join form, not a login redirect', async ({
    page,
  }) => {
    await page.goto('/session/join');

    await expect(page).toHaveURL(/\/session\/join/);
    await expect(page).not.toHaveURL(/auth\/login/);
    await expect(page.locator('#session-join-code')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#session-join-name')).toBeVisible();
  });

  test('an anonymous visitor landing directly on /session/:id/play is not redirected to login', async ({ page }) => {
    await page.goto('/session/11111111-1111-1111-1111-111111111111/play');

    await expect(page).toHaveURL(/\/session\/.*\/play/);
    await expect(page).not.toHaveURL(/auth\/login/);
  });

  test('control: an anonymous visitor is still redirected to login for an authenticated shell route', async ({
    page,
  }) => {
    await page.goto('/home');

    await expect(page).toHaveURL(/auth\/login/, { timeout: 10_000 });
  });

  test('a shared join link (?code=) still pre-fills the code on the public route', async ({ page }) => {
    await page.goto('/session/join?code=abc123');

    await expect(page.locator('#session-join-code')).toHaveValue('ABC123');
  });

  /**
   * US19.2.2 (backend companion: `pivot-core` `GET .../sessions/{id}/state`, guest-accessible) —
   * regression coverage for the real gap this US closes: a guest could reach `/session/:id/play`
   * and open the WS connection (US19.2.1), but the activity view never actually rendered because
   * `getSession()` 401'd for every anonymous caller (bearer-only). This proves the fix end-to-end
   * through the real join form and real `SessionParticipantShellComponent`/activity component
   * wiring, not just that the URL is reachable — a genuinely anonymous guest (no auth stub
   * anywhere in this file) must see the activity's own interactive content, not a blank/error
   * shell.
   */
  test('an anonymous guest who joins actually sees the activity content, not just the page shell', async ({
    page,
  }) => {
    const sessionId = '33333333-3333-3333-3333-333333333333';
    await stubGuestJoinAndState(page, sessionId, {
      id: sessionId,
      title: 'Rétro sprint E2E',
      type: 'WORDCLOUD',
      status: 'LIVE',
      config: { maxWordsPerParticipant: 3, blocklist: [] },
      participantCount: 1,
      startedAt: new Date().toISOString(),
      endedAt: null,
    });

    await page.goto('/session/join');
    await page.locator('#session-join-code').fill('ABCDEF');
    await page.locator('#session-join-name').fill('Guest E2E');
    await page.locator('.session-join button[type="submit"]').click();

    await expect(page).toHaveURL(new RegExp(`/session/${sessionId}/play`));
    // The WORDCLOUD activity's own submission input — proves the participant shell actually
    // loaded state (via the new guest-accessible endpoint) and mounted the real activity
    // component, not just that routing/navigation succeeded.
    await expect(page.locator('#wordcloud-word')).toBeVisible({ timeout: 10_000 });
  });
});
