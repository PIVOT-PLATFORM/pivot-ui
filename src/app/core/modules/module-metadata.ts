/**
 * Static UI metadata for each PIVOT module.
 *
 * Keyed by module id (matches PivotModuleDto.id). Merged with the API DTO in
 * ModuleRegistryService.enrichedModules() to produce PivotModuleUi objects.
 *
 * `icon` is an `IconRegistry` name (see `module-icons.ts`/`registerModuleIcons()` in
 * `app.config.ts`), not raw SVG markup — rendered via `<pivot-ds-icon [name]="mod.icon" />`.
 *
 * Add a new entry here when a new module is introduced on the backend.
 */
import type { PivotModuleUi, PivotModuleDto } from './module.model';

/** Shape of a single metadata entry (UI-only fields, no DTO fields). */
export type ModuleUiMeta = Omit<PivotModuleUi, keyof PivotModuleDto>;

/** Fallback metadata for unknown module ids. */
export function defaultMeta(id: string): ModuleUiMeta {
  return {
    icon: 'module-default',
    description: id,
    route: `/${id}`,
    comingSoon: true,
    color: '#756693',
  };
}

export const MODULE_METADATA: Record<string, ModuleUiMeta> = {
  whiteboard: {
    icon: 'module-whiteboard',
    description: 'Tableau blanc collaboratif temps réel',
    route: '/whiteboard',
    // EN17.9 — shell integration réelle (loadChildren depuis @pivot-platform/collaboratif-ui),
    // plus un placeholder. Reste absent de la grille tant qu'un tenant ne l'a pas activé
    // (enabled: false côté API) — pas un "coming soon" mais un module désactivé, différent.
    comingSoon: false,
    color: '#8B5CF6',
  },
  agilite: {
    icon: 'module-agilite',
    description: "Scrum Poker, rétrospectives et roues d'équipe",
    // EN18 — real shell integration (loadChildren from @pivot-platform/agilite-ui), not a placeholder.
    route: '/agilite',
    comingSoon: false,
    color: '#F59E0B',
  },
  session: {
    icon: 'module-session',
    description: 'Sessions live : quiz, sondages, brainstorm',
    route: '/session',
    comingSoon: true,
    color: '#F59E0B',
  },
  roadmap: {
    icon: 'module-roadmap',
    description: 'Roadmap et Gantt intégré',
    route: '/roadmap',
    comingSoon: true,
    color: '#10B981',
  },
  survey: {
    icon: 'module-survey',
    description: 'Système de sondages',
    route: '/survey',
    comingSoon: true,
    color: '#EF4444',
  },
  quiz: {
    icon: 'module-quiz',
    description: 'Quiz interactif gamifié',
    route: '/quiz',
    comingSoon: true,
    color: '#EC4899',
  },
};
