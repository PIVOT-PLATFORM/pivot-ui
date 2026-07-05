/**
 * TenantsListComponent — US06.2.3: super admin, platform-wide tenant listing
 * with search, filters, and pagination.
 *
 * Route: `/superadmin/tenants`, guarded by `superAdminGuard` (ROLE_SUPER_ADMIN only).
 *
 * States: loading (skeleton rows), error (message + retry), empty
 * ("Aucun tenant ne correspond aux filtres"), and the normal table + pagination.
 *
 * Filters (`name`, `is_active`, `plan`, `auth_mode`) are client-side form
 * state only — the actual filtering/search is always performed server-side
 * (`TenantsService.load()`), per the platform rule that filtering logic must
 * never live client-side. `plan` and `auth_mode` are backend-enforced enums
 * matched exactly (not substring) server-side, so — like `is_active` — they
 * are `<select>` inputs that apply immediately on change; only the free-text
 * `name` filter (substring, case-insensitive server-side) applies on form
 * submit, to avoid a request per keystroke.
 */
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { TenantsService } from './tenants.service';
import {
  EMPTY_TENANT_FILTERS,
  type TenantActiveFilter,
  type TenantAuthMode,
  type TenantFilters,
  type TenantPlan,
} from './tenant.model';

@Component({
  selector: 'piv-tenants-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, RouterLink, TranslocoPipe],
  templateUrl: './tenants-list.component.html',
  styleUrl: './tenants-list.component.scss',
})
export class TenantsListComponent implements OnInit {
  protected readonly service = inject(TenantsService);

  protected readonly skeletonPlaceholders = [0, 1, 2, 3, 4];
  protected readonly filters = signal<TenantFilters>({ ...EMPTY_TENANT_FILTERS });

  readonly tenants = this.service.tenants;
  readonly loading = this.service.loading;
  readonly loadError = this.service.loadError;
  readonly page = this.service.page;
  readonly totalPages = this.service.totalPages;
  readonly totalElements = this.service.totalElements;

  ngOnInit(): void {
    this.load(0);
  }

  load(page: number): void {
    this.service.load(page, this.filters()).subscribe();
  }

  isEmpty(): boolean {
    return !this.loading() && !this.loadError() && this.tenants().length === 0;
  }

  /** Submits the free-text filters (name, plan) — always re-queries from page 0. */
  onFilterSubmit(): void {
    this.load(0);
  }

  onNameInput(value: string): void {
    this.filters.update(f => ({ ...f, name: value }));
  }

  onPlanChange(value: '' | TenantPlan): void {
    this.filters.update(f => ({ ...f, plan: value }));
    this.load(0);
  }

  onIsActiveChange(value: TenantActiveFilter): void {
    this.filters.update(f => ({ ...f, isActive: value }));
    this.load(0);
  }

  onAuthModeChange(value: '' | TenantAuthMode): void {
    this.filters.update(f => ({ ...f, authMode: value }));
    this.load(0);
  }

  hasPrevious(): boolean {
    return this.page() > 0;
  }

  hasNext(): boolean {
    return this.page() + 1 < this.totalPages();
  }

  previousPage(): void {
    if (this.hasPrevious()) {
      this.load(this.page() - 1);
    }
  }

  nextPage(): void {
    if (this.hasNext()) {
      this.load(this.page() + 1);
    }
  }

  /** 1-indexed page number for display (backend is 0-indexed). */
  displayPage(): number {
    return this.page() + 1;
  }

  /** Total pages for display — floors at 1 so an empty result doesn't show "page 1 of 0". */
  displayTotalPages(): number {
    return Math.max(this.totalPages(), 1);
  }
}
