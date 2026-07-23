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
import { test, expect } from '@playwright/test';

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
});
