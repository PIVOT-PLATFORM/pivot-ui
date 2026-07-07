/**
 * E2E spec — US02.2.4, AC-13 ("Bannière persistante pendant le délai de grâce
 * rappelle la date de suppression effective et propose 'Annuler la
 * suppression'", `pivot-docs/.../us-suppression-compte.md`) — regression
 * coverage for the fix in this PR (retrospective on #83, "bannière figée
 * après expiration du délai de grâce").
 *
 * `AccountDeletionStateService.spec.ts` (Vitest, AC-13) already proves the
 * fix with `vi.useFakeTimers()` at the unit level (3 tests: live auto-expiry,
 * >24.8-day chaining, timer cancellation on re-`record()`). This spec adds
 * what that unit test structurally cannot: proof the same self-expiry
 * survives the *real* Angular Router + real browser `setTimeout` + real
 * change-detection cycle, not a faked one.
 *
 * Strategy identical to e2e/admin/admin-users.spec.ts and
 * e2e/auth/session-expiry.spec.ts: API calls are intercepted via
 * `page.route()`, so this runs without a real backend/pivot-core. The grace
 * period returned by the stubbed `DELETE /account` is a handful of seconds —
 * not the real 30-day default — specifically so the test can wait out a real
 * wall-clock timer instead of faking the browser clock (`page.clock`), which
 * would only prove the mechanism works against a fake clock, something the
 * Vitest spec already does more cheaply.
 */
import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';
const ACCOUNT_URL = '/account';

const AUTH_RESPONSE = {
  accessToken: 'opaque-token-account-deletion-banner-e2e',
  expiresAt: Date.now() + 3_600_000,
  user: {
    id: 9,
    email: 'erin@pivot.io',
    firstName: 'Erin',
    lastName: 'Delete',
    role: 'ROLE_USER',
    emailVerified: true,
    tenantId: 1,
    tenantSlug: 'acme',
  },
};

/** Stubs POST /auth/refresh so the app boots already authenticated as the given user. */
async function stubAuthenticatedSession(page: Page): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AUTH_RESPONSE) })
  );
}

test.describe('US02.2.4 — AC-13 account deletion banner auto-expiry (retrospective fix, #83)', () => {
  test('banner disappears on its own once the (stubbed, short) grace period elapses — no reload needed', async ({
    page,
  }) => {
    await stubAuthenticatedSession(page);
    await page.route(`${API}/account/deletion/confirmation-method`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ method: 'PASSWORD' }) })
    );

    // Stubbed as if the server-configured grace period were ~3s instead of the
    // real 30-day default (AC "Délai de grâce configurable" — the value
    // itself is server-driven, the Angular side just reacts to whatever
    // `effectiveDeletionDate` it is given).
    const effectiveDeletionDate = new Date(Date.now() + 3000).toISOString();
    await page.route(`${API}/account`, (route) => {
      if (route.request().method() !== 'DELETE') {
        return route.fallback();
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ effectiveDeletionDate }),
      });
    });

    await page.goto(ACCOUNT_URL);

    await page.getByTestId('account-settings-delete-trigger').click();
    // Step 1 (irreversibility warning) → step 2 (password confirm form) — same
    // "confirm-dialog-confirm" button drives both steps of the 2-step dialog.
    await page.getByTestId('confirm-dialog-confirm').click();
    await page.locator('#account-deletion-password').fill('correct-horse-battery-staple');
    await page.getByTestId('confirm-dialog-confirm').click();

    // Deletion "succeeded" (stubbed 200) — all sessions revoked, app navigates
    // to /auth/login. The banner is mounted at the app root (like ToastComponent),
    // precisely so it is visible there per the AC/service doc.
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
    const banner = page.getByTestId('account-deletion-banner');
    await expect(banner).toBeVisible();

    // Nothing calls record()/clear() again and the page is never reloaded from
    // here on — this is exactly the "long-lived tab left open across the
    // deadline" scenario the fix targets (a `computed()` without the `now`
    // signal + scheduled wake-up would keep this banner stuck forever). Real
    // wall-clock wait, not a faked clock: the point is to prove the real
    // browser `setTimeout` + Angular signal wake-up flips `pending()` to
    // `null` on its own.
    await expect(banner).toBeHidden({ timeout: 8000 });
  });
});
