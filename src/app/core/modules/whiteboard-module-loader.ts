import { Routes } from '@angular/router';
import { environment } from '../../../environments/environment';

/**
 * Fallback route tree activated when `@pivot-platform/collaboratif-ui`'s dynamic `import()`
 * rejects (network failure, stale/missing content-hashed chunk after a deployment, GitHub
 * Packages registry unreachable at runtime). Kept as a lazy `loadComponent()` itself — this
 * chunk is tiny and part of the shell's own bundle graph, unaffected by the failure it recovers
 * from.
 */
const MODULE_LOAD_ERROR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../features/module-load-error/module-load-error.component').then(
        m => m.ModuleLoadErrorComponent,
      ),
  },
];

/**
 * Loads the whiteboard module's real routes (`COLLABORATIF_ROUTES`) from the published
 * `@pivot-platform/collaboratif-ui` package — EN17.10.
 *
 * `provideCollaboratifUi()` (the package's own config entry point, same pattern as ui-core's
 * `provideUiCore`) is only ever referenced through the already-dynamically-imported module
 * namespace `m` — never imported statically at the top of this file — so the whole
 * `@pivot-platform/collaboratif-ui` bundle stays a real, separate, lazily-fetched chunk. A
 * static top-level import here would pull it into the shell's eagerly-loaded graph and defeat
 * "aucun bundle chargé si désactivé" (EN03.2) for every tenant, active or not.
 *
 * Isolated into its own named function (rather than an inline arrow directly in
 * `app.routes.ts`) so the failure path (AC "Error case: given `@pivot-platform/collaboratif-ui`
 * indisponible ou erreur de chargement dynamique... then un fallback est géré côté shell — pas
 * de page blanche silencieuse") is unit-testable with Vitest by mocking the module specifier —
 * Angular's Router only exercises the real `import()` machinery in a browser, which is covered
 * separately by `e2e/modules/whiteboard-shell-wiring.spec.ts`.
 */
export function loadWhiteboardModule(): Promise<Routes> {
  return import('@pivot-platform/collaboratif-ui')
    .then(
      m =>
        [
          {
            path: '',
            providers: [m.provideCollaboratifUi({ apiUrl: environment.collaboratifApiUrl })],
            children: m.COLLABORATIF_ROUTES,
          },
        ] satisfies Routes,
    )
    .catch(() => MODULE_LOAD_ERROR_ROUTES);
}
