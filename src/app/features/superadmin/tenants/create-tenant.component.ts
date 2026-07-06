/**
 * CreateTenantComponent — US06.2.1: super admin creates a new tenant.
 *
 * Route: `/superadmin/tenants/new`, guarded by `superAdminGuard` (ROLE_SUPER_ADMIN only).
 *
 * Fields: name (required), slug (auto-generated from name in real time via
 * {@link slugify}, but editable — once the operator edits it directly, name
 * changes stop overwriting it), plan (select), authMode (select). The slug
 * field is checked for availability against `GET check-slug` with a 500ms
 * debounce (AC) as it changes, whether the change came from auto-generation
 * or a direct edit.
 *
 * Slug conflicts are surfaced twice, both inline on the slug field:
 * - proactively, from the debounced `check-slug` response (`RESERVED`/`TAKEN`);
 * - authoritatively, from the actual submit response (`409`/`422`) — the
 *   real-time check is a UX aid, not a substitute for server-side validation
 *   (a slug can be taken by a concurrent request between the check and the
 *   submit).
 *
 * No tenant detail page exists yet in pivot-ui, so on success this redirects
 * to the US06.2.3 tenants list (`/superadmin/tenants`) instead of a per-tenant
 * detail route — see PATCH_NOTES.md / PR description for this deviation.
 */
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import type { ValidationErrors } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ToastService } from '../../../shared/toast/toast.service';
import { CreateTenantService } from './create-tenant.service';
import {
  SLUG_CHECK_DEBOUNCE_MS,
  TENANT_SLUG_PATTERN,
  slugify,
  type SlugAvailability,
  type TenantCreationAuthMode,
  type TenantPlan,
} from './create-tenant.model';

/** Custom `FormControl` error keys set from server responses (real-time check or submit). */
const SERVER_SLUG_ERROR_KEYS = ['slugTaken', 'slugReserved'] as const;

@Component({
  selector: 'piv-create-tenant',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './create-tenant.component.html',
  styleUrl: './create-tenant.component.scss',
})
export class CreateTenantComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CreateTenantService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    slug: ['', [Validators.required, Validators.pattern(TENANT_SLUG_PATTERN)]],
    plan: ['SAAS' as TenantPlan, [Validators.required]],
    authMode: ['LOCAL' as TenantCreationAuthMode, [Validators.required]],
  });

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submitErrorParams = signal<Record<string, string | number>>({});
  readonly slugChecking = signal(false);
  readonly slugAvailability = signal<SlugAvailability | null>(null);

  /** True once the operator has typed directly into the slug field — stops name→slug auto-sync. */
  private slugManuallyEdited = false;
  private readonly slugCheck$ = new Subject<string>();
  private readonly subscriptions = new Subscription();

  constructor() {
    this.subscriptions.add(this.form.controls.name.valueChanges.subscribe(value => this.onNameChanged(value ?? '')));
    this.subscriptions.add(this.form.controls.slug.valueChanges.subscribe(value => this.onSlugChanged(value ?? '')));
    this.subscriptions.add(
      this.slugCheck$
        .pipe(
          debounceTime(SLUG_CHECK_DEBOUNCE_MS),
          distinctUntilChanged(),
          switchMap(slug => this.service.checkSlug(slug))
        )
        .subscribe({
          next: availability => {
            this.slugChecking.set(false);
            this.slugAvailability.set(availability);
            this.applySlugAvailability(availability);
          },
          error: () => {
            // Real-time check is a UX aid only — a failed check never blocks the form;
            // the authoritative validation still happens server-side on submit.
            this.slugChecking.set(false);
            this.slugAvailability.set(null);
          },
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /** Marks the slug as manually edited — bound to the slug field's native `(input)` event. */
  markSlugEdited(): void {
    this.slugManuallyEdited = true;
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);

    const { name, slug, plan, authMode } = this.form.getRawValue();
    this.service.create({ name: name!, slug: slug!, plan: plan!, authMode: authMode! }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.show('admin.tenants.create.toast_success', 'info', { name: name! });
        void this.router.navigateByUrl('/superadmin/tenants');
      },
      error: (err: HttpErrorResponse) => this.handleSubmitError(err),
    });
  }

  /** Translation key for the slug field's current error, or `null` if none applies. */
  slugErrorKey(): string | null {
    const control = this.form.controls.slug;
    if (control.errors?.['slugTaken']) return 'admin.tenants.create.error_slug_taken';
    if (control.errors?.['slugReserved']) return 'admin.tenants.create.error_slug_reserved';
    if (!control.touched) return null;
    if (control.errors?.['required']) return 'admin.tenants.create.error_slug_required';
    if (control.errors?.['pattern']) return 'admin.tenants.create.error_slug_format';
    return null;
  }

  /** Translation key for the name field's current error, or `null` if none applies. */
  nameErrorKey(): string | null {
    const control = this.form.controls.name;
    if (!control.touched) return null;
    if (control.errors?.['required']) return 'admin.tenants.create.error_name_required';
    if (control.errors?.['maxlength']) return 'admin.tenants.create.error_name_too_long';
    return null;
  }

  /** True when the "slug is available" success message should render. */
  slugAvailableShown(): boolean {
    return !this.slugChecking() && this.slugAvailability()?.available === true && this.slugErrorKey() === null;
  }

  /** Space-separated ids of the elements describing the slug field, for `aria-describedby`. */
  slugDescribedBy(): string {
    const ids = ['tenant-slug-hint'];
    if (this.slugChecking()) ids.push('tenant-slug-checking');
    if (this.slugErrorKey()) ids.push('tenant-slug-error');
    if (this.slugAvailableShown()) ids.push('tenant-slug-available');
    return ids.join(' ');
  }

  private onNameChanged(name: string): void {
    if (this.slugManuallyEdited) {
      return;
    }
    this.form.controls.slug.setValue(slugify(name));
  }

  private onSlugChanged(slug: string): void {
    this.clearServerSlugErrors();
    this.slugAvailability.set(null);

    const trimmed = slug.trim();
    if (trimmed === '') {
      this.slugChecking.set(false);
      return;
    }
    this.slugChecking.set(true);
    this.slugCheck$.next(trimmed);
  }

  private applySlugAvailability(availability: SlugAvailability): void {
    const control = this.form.controls.slug;
    const baseErrors = this.slugErrorsWithoutServerKeys();
    if (!availability.available && availability.reason === 'TAKEN') {
      control.setErrors({ ...baseErrors, slugTaken: true });
    } else if (!availability.available && availability.reason === 'RESERVED') {
      control.setErrors({ ...baseErrors, slugReserved: true });
    } else {
      control.setErrors(Object.keys(baseErrors).length > 0 ? baseErrors : null);
    }
  }

  private clearServerSlugErrors(): void {
    const control = this.form.controls.slug;
    const baseErrors = this.slugErrorsWithoutServerKeys();
    control.setErrors(Object.keys(baseErrors).length > 0 ? baseErrors : null);
  }

  /** Current slug control errors, minus the custom keys this component itself sets. */
  private slugErrorsWithoutServerKeys(): ValidationErrors {
    const errors = { ...(this.form.controls.slug.errors ?? {}) };
    for (const key of SERVER_SLUG_ERROR_KEYS) {
      delete errors[key];
    }
    return errors;
  }

  private handleSubmitError(err: HttpErrorResponse): void {
    this.submitting.set(false);
    switch (err.status) {
      case 409:
        this.form.controls.slug.setErrors({ ...this.slugErrorsWithoutServerKeys(), slugTaken: true });
        break;
      case 422:
        this.form.controls.slug.setErrors({ ...this.slugErrorsWithoutServerKeys(), slugReserved: true });
        break;
      case 429: {
        const seconds: number = err.error?.retryAfterSeconds ?? 0;
        this.submitError.set('admin.tenants.create.error_rate_limit');
        this.submitErrorParams.set({ time: this.formatRetryAfter(seconds) });
        break;
      }
      case 403:
        this.submitError.set('admin.tenants.create.error_forbidden');
        break;
      case 400:
        this.submitError.set('admin.tenants.create.error_validation');
        break;
      default:
        this.submitError.set('common.error_generic');
    }
  }

  /**
   * Formats a retry delay for the `error_rate_limit` message. Clamped to a
   * 1-second floor — a missing, zero, negative or non-finite
   * `retryAfterSeconds` (all possible depending on backend clock skew or a
   * malformed body) must never render an empty `{{ time }}` and produce a
   * grammatically broken "Réessayez dans ." message.
   */
  private formatRetryAfter(seconds: number): string {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(1, Math.floor(seconds)) : 1;
    const m = Math.floor(safeSeconds / 60);
    const s = safeSeconds % 60;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  }
}
