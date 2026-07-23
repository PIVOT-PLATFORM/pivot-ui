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
