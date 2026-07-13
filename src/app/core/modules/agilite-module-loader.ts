import { Routes } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ModuleLoadErrorComponent } from '../../features/module-load-error/module-load-error.component';

/** Fallback route tree when `@pivot-platform/agilite-ui`'s dynamic import fails (mirrors the whiteboard loader). */
const MODULE_LOAD_ERROR_ROUTES: Routes = [{ path: '', component: ModuleLoadErrorComponent }];

/**
 * Loads the agilite module's real routes (`AGILITE_ROUTES`) from `@pivot-platform/agilite-ui`
 * (EN18 — same lazy-chunk + fallback pattern as {@link import('./whiteboard-module-loader').loadWhiteboardModule}).
 * `provideAgiliteUi()` is referenced only through the dynamically-imported namespace so the whole
 * package stays a separate lazily-fetched chunk (never eagerly pulled into the shell bundle).
 */
export function loadAgiliteModule(): Promise<Routes> {
  return import('@pivot-platform/agilite-ui')
    .then(
      m =>
        [
          {
            path: '',
            providers: [
              m.provideAgiliteUi({ apiUrl: environment.agiliteApiUrl, wsUrl: environment.agiliteWsUrl }),
            ],
            children: m.AGILITE_ROUTES,
          },
        ] satisfies Routes,
    )
    .catch(() => MODULE_LOAD_ERROR_ROUTES);
}
