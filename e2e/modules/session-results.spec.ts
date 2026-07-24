/**
 * E2E specs — US19.4.1 / US19.4.2: facilitator results view. A `COMPLETED` session renders a
 * frozen snapshot (no WS connection), so these specs are fully driven by mocked REST reads
 * (`page.route(...).fulfill`) — the same ephemeral, backend-free pattern as
 * `session-public-join.spec.ts`. The `:sessionId/results` route is served by the public mount
 * (`sessionPublicRoutes`), reachable without an authenticated session.
 */
import { test, expect, type Page } from '@playwright/test';

// Same relative same-origin API path the shell configures (EN53.4) — match origin-agnostically.
const COLLABORATIF_API = '**/api/collaboratif';
const SID = 's-e2e-results';

async function stubCompletedPoll(page: Page): Promise<void> {
  await page.route(new RegExp(`/api/collaboratif/sessions/${SID}$`), (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: SID,
        title: 'Sprint retro',
        type: 'POLL',
        status: 'COMPLETED',
        joinCode: 'ABCDEF',
        config: {},
        teamId: null,
        participantCount: 3,
        createdAt: '2026-07-23T08:00:00Z',
        startedAt: '2026-07-23T08:01:00Z',
        endedAt: '2026-07-23T08:30:00Z',
      }),
    })
  );
  await page.route(new RegExp(`/api/collaboratif/sessions/${SID}/poll/results$`), (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { optionId: 'a', label: 'TypeScript', count: 3, percent: 60 },
        { optionId: 'b', label: 'JavaScript', count: 2, percent: 40 },
      ]),
    })
  );
}

test.describe('US19.4.1/19.4.2 — facilitator results view', () => {
  test('renders POLL tallies, toggles projection, and exports on a COMPLETED session', async ({ page }) => {
    await stubCompletedPoll(page);
    await page.route(new RegExp(`/api/collaboratif/sessions/${SID}/results\\?`), (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    );

    await page.goto(`/session/${SID}/results`);

    // Happy path: the POLL snapshot renders labels + tallies.
    await expect(page.getByText('TypeScript')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('60% (3)')).toBeVisible();

    // Projection mode toggles aria-pressed.
    const projection = page.locator('.session-results__projection');
    await expect(projection).toHaveAttribute('aria-pressed', 'false');
    await projection.click();
    await expect(projection).toHaveAttribute('aria-pressed', 'true');

    // Export (US19.4.2) — clicking JSON fires the export request with the format param.
    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => req.url().includes(`/sessions/${SID}/results`) && req.url().includes('format=json')
      ),
      page.locator('.session-results__export').first().click(),
    ]);
    expect(request.method()).toBe('GET');
  });

  test('shows a neutral error state when the session load fails', async ({ page }) => {
    await page.route(new RegExp(`/api/collaboratif/sessions/${SID}$`), (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 'NOT_FOUND' }) })
    );

    await page.goto(`/session/${SID}/results`);

    // Error case: a non-owner / missing session surfaces the neutral load-error message, no crash.
    await expect(page.locator('.session-results__error')).toBeVisible({ timeout: 10_000 });
  });
});
