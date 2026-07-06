/**
 * PlansListComponent — US03.3.1: super admin, platform-wide plan listing
 * with an inline "create plan" form.
 *
 * Route: `/superadmin/plans`, guarded by `superAdminGuard` (ROLE_SUPER_ADMIN only).
 *
 * States: loading (skeleton rows), error (message + retry), empty ("Aucun
 * plan n'existe encore"), and the normal table. Plan creation is a single
 * required `name` field — kept as an inline form on this same route rather
 * than a separate `/new` route (unlike the tenants precedent) since plan
 * creation has no other fields and no debounced server-side checks.
 */
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { PlansService } from './plans.service';
import { PLAN_NAME_MAX_LENGTH } from './plan.model';

@Component({
  selector: 'piv-plans-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, TranslocoPipe],
  templateUrl: './plans-list.component.html',
  styleUrl: './plans-list.component.scss',
})
export class PlansListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  protected readonly service = inject(PlansService);

  protected readonly skeletonPlaceholders = [0, 1, 2];

  readonly plans = this.service.plans;
  readonly loading = this.service.loading;
  readonly loadError = this.service.loadError;

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(PLAN_NAME_MAX_LENGTH)]],
  });

  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.service.loadAll().subscribe();
  }

  isEmpty(): boolean {
    return !this.loading() && !this.loadError() && this.plans().length === 0;
  }

  /** Translation key for the name field's current error, or `null` if none applies. */
  nameErrorKey(): string | null {
    const control = this.form.controls.name;
    if (control.errors?.['nameTaken']) return 'superadmin.plans.create.error_name_taken';
    if (!control.touched) return null;
    if (control.errors?.['required']) return 'superadmin.plans.create.error_name_required';
    if (control.errors?.['maxlength']) return 'superadmin.plans.create.error_name_too_long';
    return null;
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.creating()) {
      return;
    }
    this.creating.set(true);
    this.createError.set(null);

    const name = this.form.getRawValue().name!.trim();
    this.service.create({ name }).subscribe({
      next: () => {
        this.creating.set(false);
        this.form.reset({ name: '' });
      },
      error: (err: HttpErrorResponse) => this.handleCreateError(err),
    });
  }

  private handleCreateError(err: HttpErrorResponse): void {
    this.creating.set(false);
    switch (err.status) {
      case 409:
        this.form.controls.name.setErrors({ ...this.form.controls.name.errors, nameTaken: true });
        break;
      case 400:
        this.createError.set('superadmin.plans.create.error_validation');
        break;
      case 403:
        this.createError.set('superadmin.plans.create.error_forbidden');
        break;
      default:
        this.createError.set('common.error_generic');
    }
  }
}
