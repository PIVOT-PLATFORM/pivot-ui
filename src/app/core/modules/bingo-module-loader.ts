import { Routes } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ModuleLoadErrorComponent } from '../../features/module-load-error/module-load-error.component';

/**
 * Fallback route tree activated when `@pivot-platform/collaboratif-ui`'s dynamic `import()`
 * rejects — same rationale as `session-module-loader.ts`'s own `MODULE_LOAD_ERROR_ROUTES`.
 */
const MODULE_LOAD_ERROR_ROUTES: Routes = [
  {
    path: '',
    component: ModuleLoadErrorComponent,
  },
];

/**
 * Loads the Bingo des réunions routes (`BINGO_ROUTES`) from `@pivot-platform/collaboratif-ui`
 * (US47.1.1, E47/F47.1) — same package as `loadSessionModule`/`loadWhiteboardModule` (`bingo` is a
 * sibling feature within `collaboratif-ui`, not a separate library); `provideCollaboratifUi()` is
 * reused as-is, no new config entry point needed.
 */
export function loadBingoModule(): Promise<Routes> {
  return import('@pivot-platform/collaboratif-ui')
    .then(
      m =>
        [
          {
            path: '',
            providers: [m.provideCollaboratifUi({ apiUrl: environment.collaboratifApiUrl })],
            children: m.BINGO_ROUTES,
          },
        ] satisfies Routes,
    )
    .catch(() => MODULE_LOAD_ERROR_ROUTES);
}

/**
 * Loads the **public**, unguarded participant subset of the Bingo routes (`BINGO_PUBLIC_ROUTES` —
 * `join`, `:roomId`) — AC-47.1.1-03 requires an anonymous participant (no PIVOT account, no
 * bearer token) to be able to join and play, which `loadBingoModule`'s guarded tree cannot serve.
 * See `app.routes.ts`'s `BINGO_PUBLIC_ROUTE` and `collaboratif-ui`'s `bingoPublicRoutes` TSDoc for
 * the full rationale — same pattern as `loadSessionPublicModule`.
 */
export function loadBingoPublicModule(): Promise<Routes> {
  return import('@pivot-platform/collaboratif-ui')
    .then(
      m =>
        [
          {
            path: '',
            providers: [m.provideCollaboratifUi({ apiUrl: environment.collaboratifApiUrl })],
            children: m.BINGO_PUBLIC_ROUTES,
          },
        ] satisfies Routes,
    )
    .catch(() => MODULE_LOAD_ERROR_ROUTES);
}
