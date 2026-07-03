/**
 * ModuleAccessOverlayComponent — full-shell interstitial shown while moduleGuard is
 * verifying module access (GET /api/modules/{id}/status pending).
 *
 * `role="status"` is a polite live region: it announces the loading state to screen
 * readers without interrupting them, and the visible overlay prevents any partial
 * render of the target module route underneath while the guard resolves.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ModuleGuardLoadingService } from './module-guard-loading.service';

@Component({
  selector: 'piv-module-access-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    @if (checking()) {
      <div class="module-access-overlay" role="status">
        <span class="module-access-overlay__spinner" aria-hidden="true"></span>
        <span class="module-access-overlay__text">{{ 'modules.guard.checking' | transloco }}</span>
      </div>
    }
  `,
  styles: [`
    .module-access-overlay {
      position: fixed;
      inset: 0;
      z-index: 2000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      background: color-mix(in srgb, var(--surface-bg) 88%, transparent);
      backdrop-filter: blur(2px);
    }
    .module-access-overlay__spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--color-gray-200);
      border-top-color: var(--color-brand-600);
      border-radius: 50%;
      animation: piv-module-access-spin 0.8s linear infinite;
    }
    .module-access-overlay__text {
      font-size: var(--text-sm);
      color: var(--color-gray-700);
    }
    @keyframes piv-module-access-spin {
      to { transform: rotate(360deg); }
    }
    @media (prefers-reduced-motion: reduce) {
      .module-access-overlay__spinner { animation: none; }
    }
  `],
})
export class ModuleAccessOverlayComponent {
  private readonly loading = inject(ModuleGuardLoadingService);
  readonly checking = this.loading.checking;
}
