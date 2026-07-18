/**
 * Configuration partagée des tests d'accessibilité automatisés (axe-core).
 *
 * Importer ce module en tête de chaque `*.a11y.spec.ts` enregistre le matcher
 * `toHaveNoViolations` sur l'objet `expect` de Vitest et réexporte `axe` avec un
 * jeu de règles orienté WCAG 2.1 A/AA.
 *
 * Ce fichier n'est *pas* un setup global Vitest : il est importé explicitement
 * par les specs a11y afin de ne pas modifier le `src/test-setup.ts` partagé et
 * d'éviter tout conflit avec d'autres PR touchant la config de test.
 */
import * as axeMatchers from 'vitest-axe/matchers';
import { configureAxe } from 'vitest-axe';
import { expect } from 'vitest';
import type { AxeResults } from 'axe-core';

// Enregistre `toHaveNoViolations` (et les autres matchers vitest-axe) sur expect.
expect.extend(axeMatchers);

/**
 * Augmentation du type `Matchers` de Vitest 4.
 *
 * Le paquet `vitest-axe@0.1.0` n'augmente que l'ancien namespace `Vi`, absent
 * de Vitest 4 — on déclare donc ici `toHaveNoViolations` sur l'interface
 * `Matchers` du module `vitest`, seul point d'extension typé de Vitest 4.
 */
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Matchers<T = any> {
    toHaveNoViolations(): T;
  }
}

/** Résultat brut d'une passe axe (réexporté pour les specs qui inspectent les violations). */
export type { AxeResults };

/**
 * Instance axe préconfigurée pour le design system.
 *
 * On cible les tags WCAG 2.1 niveaux A et AA (posture a11y du DS). Chaque appel
 * reçoit un élément DOM déjà rendu par TestBed.
 */
export const axe = configureAxe({
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  },
});
