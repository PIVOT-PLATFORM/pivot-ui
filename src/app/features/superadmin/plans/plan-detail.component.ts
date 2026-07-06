/**
 * PlanDetailComponent — US03.3.1: super admin view/edit of a single plan's
 * module list.
 *
 * Route: `/superadmin/plans/:planId`, guarded by `superAdminGuard`
 * (ROLE_SUPER_ADMIN only).
 *
 * States: loading (skeleton), not-found (404 — unknown planId), error (other
 * failure + retry), and the normal view: plan name, module chips with a
 * remove action each, and an "add module" form.
 *
 * Two deliberate design decisions, both driven by gaps in the backend
 * contract (`plan.model.ts`):
 *
 * - **Module id is free text.** There is no super-admin-scoped "list every
 *   module id known to the registry" endpoint (the existing `GET
 *   /api/modules` requires a resolved tenant context and doesn't fit this
 *   cross-tenant screen), so the add-module input is a plain non-blank text
 *   field submitted via the single-add endpoint. An unknown module id comes
 *   back as `400 UNKNOWN_MODULE_ID`, surfaced inline next to the input
 *   rather than silently failing.
 * - **Removal goes through the full-replace PUT, not a DELETE.** There is no
 *   dedicated "remove one module" endpoint — only full-replace (PUT) and
 *   single-add (POST). {@link removeModule} calls `PlansService.replaceModules`
 *   with the current module list minus the removed id, including the case
 *   where that empties the list (a valid, non-error request per the backend
 *   contract).
 */
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { PlansService } from './plans.service';

@Component({
  selector: 'piv-plan-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, TranslocoPipe],
  templateUrl: './plan-detail.component.html',
  styleUrl: './plan-detail.component.scss',
})
export class PlanDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly service = inject(PlansService);

  readonly currentPlan = this.service.currentPlan;
  readonly detailLoading = this.service.detailLoading;
  readonly detailError = this.service.detailError;
  readonly detailNotFound = this.service.detailNotFound;

  readonly moduleIdInput = signal('');
  readonly addingModule = signal(false);
  readonly addModuleError = signal<string | null>(null);
  readonly addModuleErrorParams = signal<Record<string, string>>({});

  readonly removingModuleId = signal<string | null>(null);
  readonly removeError = signal<string | null>(null);

  private planId = 0;

  ngOnInit(): void {
    this.planId = Number(this.route.snapshot.paramMap.get('planId'));
    this.load();
  }

  load(): void {
    this.service.loadOne(this.planId).subscribe();
  }

  isEmptyModules(): boolean {
    return (
      !this.detailLoading() &&
      !this.detailError() &&
      !this.detailNotFound() &&
      (this.currentPlan()?.moduleIds.length ?? 0) === 0
    );
  }

  onModuleIdInput(value: string): void {
    this.moduleIdInput.set(value);
    this.addModuleError.set(null);
  }

  canAddModule(): boolean {
    return this.moduleIdInput().trim() !== '' && !this.addingModule();
  }

  addModule(): void {
    const moduleId = this.moduleIdInput().trim();
    if (!this.canAddModule()) {
      return;
    }
    this.addingModule.set(true);
    this.addModuleError.set(null);

    this.service.addModule(this.planId, moduleId).subscribe({
      next: () => {
        this.addingModule.set(false);
        this.moduleIdInput.set('');
      },
      error: (err: HttpErrorResponse) => this.handleAddModuleError(err, moduleId),
    });
  }

  removeModule(moduleId: string): void {
    const plan = this.currentPlan();
    if (!plan || this.removingModuleId() !== null) {
      return;
    }
    this.removingModuleId.set(moduleId);
    this.removeError.set(null);

    const nextModuleIds = plan.moduleIds.filter(id => id !== moduleId);
    this.service.replaceModules(this.planId, nextModuleIds).subscribe({
      next: () => this.removingModuleId.set(null),
      error: () => {
        this.removingModuleId.set(null);
        this.removeError.set('superadmin.plans.detail.error_remove');
      },
    });
  }

  private handleAddModuleError(err: HttpErrorResponse, moduleId: string): void {
    this.addingModule.set(false);
    switch (err.status) {
      case 400:
        this.addModuleErrorParams.set({ moduleId });
        this.addModuleError.set('superadmin.plans.detail.error_unknown_module');
        break;
      case 404:
        this.addModuleError.set('superadmin.plans.detail.error_plan_not_found');
        break;
      default:
        this.addModuleError.set('common.error_generic');
    }
  }
}
