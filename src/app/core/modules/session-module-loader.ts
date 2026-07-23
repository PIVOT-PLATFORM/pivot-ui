import { Routes } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ModuleLoadErrorComponent } from '../../features/module-load-error/module-load-error.component';

/**
 * Fallback route tree activated when `@pivot-platform/collaboratif-ui`'s dynamic `import()`
 * rejects — same rationale as `whiteboard-module-loader.ts`'s own `MODULE_LOAD_ERROR_ROUTES`
 * (`ModuleLoadErrorComponent` imported statically so the fallback itself never depends on a
 * second lazy `import()` that could fail the same way).
 */
const MODULE_LOAD_ERROR_ROUTES: Routes = [
  {
    path: '',
    component: ModuleLoadErrorComponent,
  },
];

/**
 * Loads the Module Session live routes (`SESSION_ROUTES`) from the published
 * `@pivot-platform/collaboratif-ui` package — US19.2.2 (EN19.3, already-existing `moduleGuard`
 * infra, this loader is the only new piece).
 *
 * Same package as `loadWhiteboardModule` (`session` is a sibling feature within
 * `collaboratif-ui`, not a separate library) — `provideCollaboratifUi()` is reused as-is, no new
 * config entry point needed.
 */
export function loadSessionModule(): Promise<Routes> {
  return import('@pivot-platform/collaboratif-ui')
    .then(
      m =>
        [
          {
            path: '',
            providers: [m.provideCollaboratifUi({ apiUrl: environment.collaboratifApiUrl })],
            children: m.SESSION_ROUTES,
          },
        ] satisfies Routes,
    )
    .catch(() => MODULE_LOAD_ERROR_ROUTES);
}

/**
 * Loads the **public**, unguarded participant subset of the Module Session live routes
 * (`SESSION_PUBLIC_ROUTES` — join, `:sessionId/play`, `:sessionId/results`) — US19.2.1's AC
 * requires `session/join` to be reachable with no PIVOT account and no bearer token at all
 * (anonymous `ROLE_GUEST` participation), which `loadSessionModule`'s `SESSION_ROUTE` cannot
 * satisfy: it sits inside the shell's authenticated route tree (`authMatchGuard`) AND behind
 * `moduleGuard('session')` (itself a bearer-token-gated status check). See `app.routes.ts`'s
 * `SESSION_PUBLIC_ROUTE` (registered as a top-level public-fallback sibling, unguarded — same
 * pattern already used for `contact`/`legal`/`account/deletion/cancel`) and `collaboratif-ui`'s
 * `sessionPublicRoutes` TSDoc for the full rationale.
 */
export function loadSessionPublicModule(): Promise<Routes> {
  return import('@pivot-platform/collaboratif-ui')
    .then(
      m =>
        [
          {
            path: '',
            providers: [m.provideCollaboratifUi({ apiUrl: environment.collaboratifApiUrl })],
            children: m.SESSION_PUBLIC_ROUTES,
          },
        ] satisfies Routes,
    )
    .catch(() => MODULE_LOAD_ERROR_ROUTES);
}
