import { Routes } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ModuleLoadErrorComponent } from '../../features/module-load-error/module-load-error.component';

/** Fallback route tree when `@pivot-platform/pilotage-ui`'s dynamic import fails (mirrors the whiteboard loader). */
const MODULE_LOAD_ERROR_ROUTES: Routes = [{ path: '', component: ModuleLoadErrorComponent }];

/**
 * Loads the pilotage module's real routes (`PILOTAGE_ROUTES`) from `@pivot-platform/pilotage-ui`
 * (EN18 — same lazy-chunk + fallback pattern as {@link import('./whiteboard-module-loader').loadWhiteboardModule}).
 * `providePilotageUi()` is referenced only through the dynamically-imported namespace so the whole
 * package stays a separate lazily-fetched chunk (never eagerly pulled into the shell bundle).
 */
export function loadPilotageModule(): Promise<Routes> {
  return import('@pivot-platform/pilotage-ui')
    .then(
      m =>
        [
          {
            path: '',
            providers: [m.providePilotageUi({ apiUrl: environment.pilotageApiUrl })],
            children: m.PILOTAGE_ROUTES,
          },
        ] satisfies Routes,
    )
    .catch(() => MODULE_LOAD_ERROR_ROUTES);
}
