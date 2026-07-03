import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const API = 'http://localhost:8080/api';
const LOGIN_URL = '/auth/login';
const DEVICE_URL = '/auth/device-confirm';

const VALID_CREDENTIALS = { email: 'user@pivot.io', password: 'Str0ng!Pass' };
const FINGERPRINT = 'fp-unknown-device-xyz';

const AUTH_RESPONSE = {
  accessToken: 'opaque-device-ok-456',
  expiresAt: Date.now() + 3_600_000,
  user: { id: 3, email: 'user@pivot.io', firstName: 'Carol', lastName: 'D', role: 'USER', emailVerified: true, tenantId: 1, tenantSlug: 'acme' },
};

async function stubRefreshUnauthorized(page: Page): Promise<void> {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"No session"}' })
  );
}

/** Stubs login to return 202 + X-Device-Verification-Required (MFA triggered). */
async function stubLoginRequiresMfa(page: Page): Promise<void> {
  await page.route(`${API}/auth/login`, (route) =>
    route.fulfill({
      status: 202,
      headers: { 'X-Device-Verification-Required': 'true' },
      contentType: 'application/json',
      body: '{}',
    })
  );
}

async function stubDeviceVerifyOk(page: Page, context: BrowserContext): Promise<void> {
  await page.route(`${API}/auth/device/verify`, async (route) => {
    await context.addCookies([{ name: 'pivot_session', value: 'sess-device-ok', domain: 'localhost', path: '/', httpOnly: true, secure: false, sameSite: 'Strict' }]);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AUTH_RESPONSE) });
  });
}

async function stubDeviceVerifyInvalid(page: Page): Promise<void> {
  await page.route(`${API}/auth/device/verify`, (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"OTP invalide"}' })
  );
}

async function stubDeviceVerifyRateLimit(page: Page): Promise<void> {
  await page.route(`${API}/auth/device/verify`, (route) =>
    route.fulfill({ status: 429, contentType: 'application/json', body: '{"message":"Too many attempts"}' })
  );
}

test.describe('US-AUTH-002 — Device MFA (OTP)', () => {
  test.beforeEach(async ({ page }) => {
    await stubRefreshUnauthorized(page);
  });

  test('MFA triggered — login with unknown device shows device confirmation alert', async ({ page }) => {
    await stubLoginRequiresMfa(page);
    await page.goto(LOGIN_URL);
    await page.fill('#email', VALID_CREDENTIALS.email);
    await page.fill('#password', VALID_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // The login component shows a device verification alert (not the form)
    const deviceAlert = page.locator('.alert-info, [data-testid="device-alert"]');
    await expect(deviceAlert).toBeVisible({ timeout: 5_000 });
    // Link to device-confirm page must be present
    await expect(page.locator(`a[href*="device-confirm"], a[routerLink*="device-confirm"]`)).toBeVisible();
  });

  test('device confirm — valid OTP redirects to /home (US01.1.4)', async ({ page, context }) => {
    await stubDeviceVerifyOk(page, context);
    // Pas d'override de /auth/refresh ici : pendant la MFA device, aucune session n'existe
    // encore (le token n'est émis qu'après /device/verify). Laisser le 401 du beforeEach —
    // sinon initSession authentifierait la page et guestGuard redirigerait vers /dashboard
    // avant l'affichage du formulaire OTP.

    await page.goto(`${DEVICE_URL}?fingerprint=${FINGERPRINT}`);
    const otpInput = page.locator('#otp, input[formControlName="otp"]');
    await expect(otpInput).toBeVisible({ timeout: 5_000 });

    await otpInput.fill('123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/home/, { timeout: 8_000 });
  });

  test('device confirm — invalid OTP shows error', async ({ page }) => {
    await stubDeviceVerifyInvalid(page);
    await page.goto(`${DEVICE_URL}?fingerprint=${FINGERPRINT}`);
    const otpInput = page.locator('#otp, input[formControlName="otp"]');
    await expect(otpInput).toBeVisible({ timeout: 5_000 });

    await otpInput.fill('000000');
    await page.click('button[type="submit"]');
    const err = page.locator('.alert-error');
    await expect(err).toBeVisible({ timeout: 5_000 });
    await expect(err).not.toBeEmpty();
  });

  test('device confirm — rate limit (429) shows specific error', async ({ page }) => {
    await stubDeviceVerifyRateLimit(page);
    await page.goto(`${DEVICE_URL}?fingerprint=${FINGERPRINT}`);
    const otpInput = page.locator('#otp, input[formControlName="otp"]');
    await expect(otpInput).toBeVisible({ timeout: 5_000 });

    await otpInput.fill('999999');
    await page.click('button[type="submit"]');
    const err = page.locator('.alert-error');
    await expect(err).toBeVisible({ timeout: 5_000 });
    await expect(err).not.toBeEmpty();
  });

  test('device confirm — cancel returns to login', async ({ page }) => {
    await page.goto(`${DEVICE_URL}?fingerprint=${FINGERPRINT}`);
    await expect(page.locator('#otp, input[formControlName="otp"]')).toBeVisible({ timeout: 5_000 });
    await page.click('a[routerLink="/auth/login"], a[href="/auth/login"]');
    await expect(page).toHaveURL(new RegExp(LOGIN_URL), { timeout: 5_000 });
  });
});
