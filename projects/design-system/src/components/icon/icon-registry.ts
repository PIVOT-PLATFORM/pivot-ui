import { Injectable } from '@angular/core';

/**
 * Registre d'icônes SVG inline du design system PIVOT.
 *
 * EN17.13 (Vague 0) — fondation icônes. Conforme ADR-007 : **SVG inline, tree-shakeable,
 * aucune font-icon, aucune lib visuelle tierce**. Chaque entrée est le *contenu interne*
 * d'un `<svg>` 24×24 (tracés `stroke="currentColor"`), rendu par {@link IconComponent}.
 *
 * Les tracés du jeu par défaut sont dérivés de **Lucide** (licence ISC) — repris tels quels
 * pour rester cohérent avec la charte « net et carré » ; l'application peut enrichir le
 * registre au démarrage via {@link register} / {@link registerMany}.
 *
 * @example
 * ```ts
 * inject(IconRegistry).register('rocket', '<path d="..."/>');
 * ```
 */
@Injectable({ providedIn: 'root' })
export class IconRegistry {
  private readonly icons = new Map<string, string>(DEFAULT_ICONS);

  /** Enregistre (ou remplace) une icône. `svgBody` = contenu interne d'un `<svg>` 24×24. */
  register(name: string, svgBody: string): void {
    this.icons.set(name, svgBody);
  }

  /** Enregistre plusieurs icônes d'un coup. */
  registerMany(entries: Record<string, string>): void {
    for (const [name, body] of Object.entries(entries)) {
      this.icons.set(name, body);
    }
  }

  /** Retourne le contenu SVG d'une icône, ou `undefined` si inconnue. */
  get(name: string): string | undefined {
    return this.icons.get(name);
  }

  /** Vrai si l'icône est enregistrée. */
  has(name: string): boolean {
    return this.icons.has(name);
  }

  /** Noms des icônes actuellement enregistrées (utile pour Storybook / tests). */
  names(): string[] {
    return [...this.icons.keys()];
  }
}

/**
 * Jeu d'icônes par défaut — couvre les besoins immédiats des composants socle
 * (états sémantiques, select/chevrons, recherche, chargement, actions courantes).
 * Tracés Lucide (ISC), viewBox 0 0 24 24, stroke.
 */
const DEFAULT_ICONS: readonly (readonly [string, string])[] = [
  ['check', '<path d="M20 6 9 17l-5-5"/>'],
  ['x', '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'],
  ['chevron-down', '<path d="m6 9 6 6 6-6"/>'],
  ['chevron-up', '<path d="m18 15-6-6-6 6"/>'],
  ['chevron-right', '<path d="m9 18 6-6-6-6"/>'],
  ['chevron-left', '<path d="m15 18-6-6 6-6"/>'],
  ['search', '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'],
  ['plus', '<path d="M5 12h14"/><path d="M12 5v14"/>'],
  ['info', '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'],
  ['circle-check', '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'],
  [
    'circle-alert',
    '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  ],
  [
    'triangle-alert',
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  ],
  ['loader', '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>'],
] as const;
