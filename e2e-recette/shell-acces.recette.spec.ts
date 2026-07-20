/**
 * Specs d'acceptation RECETTE — shell pivot-ui.
 *
 * Jouées contre https://recette.pivot-platform.fr APRÈS déploiement (e2e-recette.yml).
 * Session déjà authentifiée par recette.setup.ts (compte de recette dédié).
 *
 * Règle de traçabilité (skill-ac-traceability) : chaque test porte l'identifiant de l'AC
 * qu'il valide, comme pour les specs éphémères — mais ici la preuve vaut sur l'infra réelle.
 * Un « vrai PO » vérifierait exactement ces parcours sur le site déployé.
 *
 * Ces cas sont non destructifs (lecture/navigation). Les AC qui écrivent (création de
 * ressources) suivent le même patron mais créent leurs données sur le tenant de test
 * (RECETTE_E2E_TENANT) et les nettoient en afterEach — cf. specs des repos modules.
 */
import { test, expect } from '@playwright/test';

test.describe('Recette — accès au shell (compte authentifié)', () => {
  test('AC-SHELL-01 : le dashboard s’affiche après login sur la recette réelle', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    // La grille des modules est le marqueur observable du shell chargé.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('AC-SHELL-02 : la grille des modules liste au moins un module activable', async ({ page }) => {
    await page.goto('/dashboard');
    const modules = page.getByRole('link', { name: /module|agilit|collaborat|pilotage/i });
    await expect(modules.first()).toBeVisible({ timeout: 10_000 });
  });

  test('AC-SHELL-03 : une route protégée hors session renvoie vers le login', async ({ browser }) => {
    // Contexte NON authentifié (pas de storageState) : la protection de route doit tenir
    // sur l'infra réelle, pas seulement en mock.
    const anon = await browser.newContext();
    const page = await anon.newPage();
    await page.goto('/account');
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
    await anon.close();
  });
});
