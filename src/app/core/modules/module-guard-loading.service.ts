/**
 * ModuleGuardLoadingService — tracks whether moduleGuard is currently awaiting the
 * GET /api/modules/{id}/status response for an in-flight navigation.
 *
 * Consumed by ModuleAccessOverlayComponent (mounted once in ShellComponent) to display
 * an interstitial "checking access" state instead of a partial render of the target
 * route while the guard resolves — EN03.2 / US03.2.2 AC "page de chargement
 * interstitielle pendant vérification, pas d'affichage partiel".
 *
 * A counter (not a boolean) is used so that overlapping guard checks (e.g. fast
 * double navigation) do not hide the overlay prematurely when one of them settles.
 */
import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ModuleGuardLoadingService {
  private readonly _pendingChecks = signal(0);

  /** True while at least one moduleGuard check is in flight. */
  readonly checking = computed(() => this._pendingChecks() > 0);

  /** Call when a guard check starts. */
  start(): void {
    this._pendingChecks.update(count => count + 1);
  }

  /** Call when a guard check settles (success, denial, or error). */
  end(): void {
    this._pendingChecks.update(count => Math.max(0, count - 1));
  }
}
