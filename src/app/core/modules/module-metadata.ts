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
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
    description: id,
    route: `/${id}`,
    comingSoon: true,
    color: '#6B7280',
  };
}

export const MODULE_METADATA: Record<string, ModuleUiMeta> = {
  whiteboard: {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M7 10 l3 3 5-5"/></svg>`,
    description: 'Tableau blanc collaboratif temps réel',
    route: '/whiteboard',
    comingSoon: true,
    color: '#8B5CF6',
  },
  session: {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><circle cx="17" cy="8" r="2"/><path d="M15 14s0-3 2-3 2 3 2 3"/></svg>`,
    description: 'Sessions live : quiz, sondages, brainstorm',
    route: '/session',
    comingSoon: true,
    color: '#F59E0B',
  },
  roadmap: {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><polyline points="15 6 21 12 15 18"/><circle cx="7" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="17" cy="12" r="1.5" fill="currentColor"/></svg>`,
    description: 'Roadmap et Gantt intégré',
    route: '/roadmap',
    comingSoon: true,
    color: '#10B981',
  },
  survey: {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><polyline points="9 9 10.5 10.5 13 8"/><polyline points="9 16 10.5 17.5 13 15"/></svg>`,
    description: 'Système de sondages',
    route: '/survey',
    comingSoon: true,
    color: '#EF4444',
  },
  quiz: {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/><polygon points="12 2 13.5 7.5 19 7.5 14.75 10.75 16.5 16.5 12 13 7.5 16.5 9.25 10.75 5 7.5 10.5 7.5" fill="none" opacity="0.4"/></svg>`,
    description: 'Quiz interactif gamifié',
    route: '/quiz',
    comingSoon: true,
    color: '#EC4899',
  },
};
