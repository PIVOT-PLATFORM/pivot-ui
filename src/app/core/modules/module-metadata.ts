/**
 * Static UI metadata for each PIVOT module.
 *
 * Keyed by module id (matches PivotModuleDto.id). Merged with the API DTO in
 * ModuleRegistryService.enrichedModules() to produce PivotModuleUi objects.
 *
 * Add a new entry here when a new module is introduced on the backend.
 */
import type { PivotModuleUi, PivotModuleDto } from './module.model';

/** Shape of a single metadata entry (UI-only fields, no DTO fields). */
export type ModuleUiMeta = Omit<PivotModuleUi, keyof PivotModuleDto>;

/** Fallback metadata for unknown module ids. */
export function defaultMeta(id: string): ModuleUiMeta {
  return {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
    description: id,
    route: `/${id}`,
    comingSoon: true,
    color: '#756693',
  };
}

export const MODULE_METADATA: Record<string, ModuleUiMeta> = {
  whiteboard: {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M7 10 l3 3 5-5"/></svg>`,
    description: 'Tableau blanc collaboratif temps réel',
    route: '/whiteboard',
    // EN17.9 — shell integration réelle (loadChildren depuis @pivot-platform/collaboratif-ui),
    // plus un placeholder. Reste absent de la grille tant qu'un tenant ne l'a pas activé
    // (enabled: false côté API) — pas un "coming soon" mais un module désactivé, différent.
    comingSoon: false,
    color: '#8B5CF6',
  },
  agilite: {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="7" height="14" rx="1"/><rect x="14" y="5" width="7" height="9" rx="1"/></svg>`,
    description: "Scrum Poker, rétrospectives et roues d'équipe",
    // EN18 — real shell integration (loadChildren from @pivot-platform/agilite-ui), not a placeholder.
    route: '/agilite',
    comingSoon: false,
    color: '#F59E0B',
  },
  session: {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><circle cx="17" cy="8" r="2"/><path d="M15 14s0-3 2-3 2 3 2 3"/></svg>`,
    description: 'Sessions live : quiz, sondages, brainstorm',
    route: '/session',
    comingSoon: true,
    color: '#F59E0B',
  },
  roadmap: {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"/><polyline points="15 6 21 12 15 18"/><circle cx="7" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="17" cy="12" r="1.5" fill="currentColor"/></svg>`,
    description: 'Roadmap et Gantt intégré',
    route: '/roadmap',
    comingSoon: true,
    color: '#10B981',
  },
  survey: {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><polyline points="9 9 10.5 10.5 13 8"/><polyline points="9 16 10.5 17.5 13 15"/></svg>`,
    description: 'Système de sondages',
    route: '/survey',
    comingSoon: true,
    color: '#EF4444',
  },
  quiz: {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    description: 'Quiz interactif gamifié',
    route: '/quiz',
    comingSoon: true,
    color: '#EC4899',
  },
};
