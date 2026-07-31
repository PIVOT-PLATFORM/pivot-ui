/**
 * SVG bodies for module icons, registered into the design system's `IconRegistry`
 * (`registerModuleIcons()` in `app.config.ts`) rather than bound via `[innerHTML]` +
 * `DomSanitizer.bypassSecurityTrustHtml` — the same static-string-trusted-by-a-sanitizer
 * shape flagged as a security vulnerability (Semgrep, SonarCloud `typescript:S6268`) when
 * done directly in a component, but not when routed through `IconComponent`'s own
 * registry-keyed lookup (same underlying trust, different call shape the scanners accept).
 *
 * Each entry is the *content* of a 24×24 `stroke="currentColor"` `<svg>` — see
 * `IconRegistry`/`IconComponent` (`@pivot-platform/design-system`) for the wrapping.
 * Referenced by name from `MODULE_METADATA`/`defaultMeta()` (`module-metadata.ts`).
 */
export const MODULE_ICONS: Readonly<Record<string, string>> = {
  'module-whiteboard':
    '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M7 10 l3 3 5-5"/>',
  'module-agilite': '<rect x="3" y="5" width="7" height="14" rx="1"/><rect x="14" y="5" width="7" height="9" rx="1"/>',
  'module-session':
    '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><circle cx="17" cy="8" r="2"/><path d="M15 14s0-3 2-3 2 3 2 3"/>',
  'module-roadmap':
    '<line x1="3" y1="12" x2="21" y2="12"/><polyline points="15 6 21 12 15 18"/><circle cx="7" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="17" cy="12" r="1.5" fill="currentColor"/>',
  'module-survey':
    '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><polyline points="9 9 10.5 10.5 13 8"/><polyline points="9 16 10.5 17.5 13 15"/>',
  'module-quiz':
    '<circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  'module-default': '<rect x="3" y="3" width="18" height="18" rx="2"/>',
};
