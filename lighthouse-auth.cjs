/**
 * Lighthouse CI — script Puppeteer d'authentification.
 *
 * Imite une connexion utilisateur réelle : se rend sur /auth/login, remplit
 * le formulaire avec un compte seedé par pivot-core (profil `test`), soumet,
 * et attend la sortie de la zone /auth (cookie de session posé). Lighthouse
 * réutilise ensuite le même navigateur → les pages protégées (/dashboard)
 * sont auditées en session authentifiée.
 *
 * Référencé par .lighthouserc.json (puppeteerScript).
 */
const BASE = process.env.LH_BASE_URL || 'http://localhost:4200';
const EMAIL = process.env.LH_USER_EMAIL || 'user@pivot.test';
const PASSWORD = process.env.LH_USER_PASSWORD || 'Pivot@Test123!';

module.exports = async (browser) => {
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('#email', { timeout: 15000 });
    await page.type('#email', EMAIL);
    await page.type('#password', PASSWORD);
    await page.click('button[type="submit"]');

    // SPA: pas de navigation full-page — on attend la sortie de /auth
    // (redirection vers /dashboard une fois la session établie).
    await page
      .waitForFunction(() => !location.pathname.startsWith('/auth'), { timeout: 20000 })
      .catch(() => {
        // eslint-disable-next-line no-console
        console.warn('[lh-auth] still on /auth after login — authenticated pages may redirect');
      });
  } finally {
    await page.close();
  }
};
