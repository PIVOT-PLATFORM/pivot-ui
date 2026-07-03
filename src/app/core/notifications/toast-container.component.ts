/**
 * ToastContainerComponent — renders the active ToastService queue.
 *
 * Mounted once in ShellComponent. Each toast uses `role="alert"` (implicit assertive
 * live region) so screen readers announce it as soon as it is inserted into the DOM —
 * required for EN03.2 / US03.2.2 AC "Toast role=alert annoncé aux lecteurs d'écran".
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ToastService } from './toast.service';

@Component({
  selector: 'piv-toast-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  template: `
    <div class="toast-container" aria-live="off">
      @for (toast of toasts(); track toast.id) {
        <div class="toast" role="alert">
          <span class="toast__text">{{ toast.text }}</span>
          @if (toast.action) {
            <a class="toast__action" [routerLink]="toast.action.route" (click)="dismiss(toast.id)">
              {{ toast.action.label }}
            </a>
          }
          <button
            type="button"
            class="toast__close"
            [attr.aria-label]="'notifications.toast.dismiss' | transloco"
            (click)="dismiss(toast.id)"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: min(420px, calc(100vw - 32px));
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: var(--surface-card);
      border: 1px solid var(--color-gray-200);
      border-left: 4px solid var(--color-warning);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      color: var(--color-gray-900);
    }
    .toast__text { flex: 1; font-size: var(--text-sm); }
    .toast__action {
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--color-brand-600);
      text-decoration: underline;
      white-space: nowrap;
    }
    .toast__close {
      appearance: none;
      background: none;
      border: none;
      cursor: pointer;
      font-size: var(--text-lg);
      line-height: 1;
      color: var(--color-gray-500);
      padding: 4px;
    }
    .toast__close:focus-visible {
      outline: 2px solid var(--color-brand-500);
      outline-offset: 2px;
      border-radius: var(--radius-sm);
    }
    @media (max-width: 480px) {
      .toast-container { right: 16px; left: 16px; bottom: 16px; max-width: none; }
    }
  `],
})
export class ToastContainerComponent {
  private readonly toastService = inject(ToastService);
  readonly toasts = this.toastService.toasts;

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
