/**
 * AdminModulesComponent — US03.2.1 : admin tenant view of the module catalogue
 * with per-module activate/deactivate toggles (US03.1.1 / US03.1.2).
 *
 * Route: `/admin/modules`, guarded by `adminGuard` (ROLE_ADMIN only).
 *
 * States: loading (skeleton grid), error (message + retry), empty
 * ("Aucun module disponible pour votre plan"), and the normal grid.
 *
 * Each card shows a text status badge (not color-only), a toggle button
 * (`aria-pressed`, `aria-label` naming the module and the action), and an
 * inline error message when activation fails because the module is not in
 * the tenant's plan (403 MODULE_NOT_IN_PLAN).
 *
 * Deactivating a module requires confirmation first (`ConfirmDialogComponent`)
 * — the API is only called after the admin confirms.
 */
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AdminModuleService } from './admin-module.service';
import type { AdminModuleDto } from './admin-module.model';
import { ToastService } from '../../../shared/toast/toast.service';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'piv-admin-modules',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, ConfirmDialogComponent],
  templateUrl: './admin-modules.component.html',
  styleUrl: './admin-modules.component.scss',
})
export class AdminModulesComponent implements OnInit {
  protected readonly service = inject(AdminModuleService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  /** Module pending a deactivate confirmation, or null when the dialog is closed. */
  private readonly confirmTarget = signal<AdminModuleDto | null>(null);

  protected readonly skeletonPlaceholders = [0, 1, 2, 3];

  readonly modules = this.service.modules;
  readonly loading = this.service.loading;
  readonly loadError = this.service.loadError;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.service.loadModules().subscribe();
  }

  isEmpty(): boolean {
    return !this.loading() && !this.loadError() && this.modules().length === 0;
  }

  /** True while the deactivate confirmation dialog should be shown. */
  isConfirmOpen(): boolean {
    return this.confirmTarget() !== null;
  }

  /** Name of the module pending deactivation confirmation, for the dialog title. */
  confirmTargetName(): string {
    return this.confirmTarget()?.name ?? '';
  }

  onToggle(module: AdminModuleDto): void {
    if (module.enabled) {
      this.confirmTarget.set(module);
    } else {
      this.runMutation(
        module,
        m => this.service.activate(m),
        'admin.modules.toast.activated',
        'admin.modules.toast.activate_error'
      );
    }
  }

  confirmDeactivate(): void {
    const module = this.confirmTarget();
    this.confirmTarget.set(null);
    if (!module) {
      return;
    }
    this.runMutation(
      module,
      m => this.service.deactivate(m),
      'admin.modules.toast.deactivated',
      'admin.modules.toast.deactivate_error'
    );
  }

  cancelDeactivate(): void {
    this.confirmTarget.set(null);
  }

  private runMutation(
    module: AdminModuleDto,
    request: (m: AdminModuleDto) => Observable<void>,
    successKey: string,
    errorKey: string
  ): void {
    const name = module.name;
    request(module).subscribe({
      next: () => this.toast.success(this.transloco.translate(successKey, { name })),
      error: () => {
        const kind = this.service.cardError(module.id);
        const message =
          kind === 'not-in-plan'
            ? this.transloco.translate('admin.modules.card.not_in_plan')
            : this.transloco.translate(errorKey, { name });
        this.toast.error(message);
      },
    });
  }
}
