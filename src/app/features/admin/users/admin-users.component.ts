/**
 * AdminUsersComponent — US06.1.2: tenant admin, paginated listing of the
 * users of their own tenant, with search, filters (role, status), and
 * pagination.
 *
 * Route: `/admin/users`, guarded by `adminGuard` (ROLE_ADMIN only).
 *
 * States: loading (skeleton rows), error (network message + retry), empty
 * ("Aucun utilisateur correspondant à vos filtres" + reset-filters button),
 * and the normal table + pagination.
 *
 * Filters are client-side form state only — filtering is always performed
 * server-side (`AdminUsersService.load()`), per the platform rule that
 * filtering logic must never live client-side. `role`/`status` are
 * backend-enforced enums matched exactly, so — like the tenant listing
 * (US06.2.3) — they are `<select>` inputs that apply immediately on change.
 * `search` is free text (substring, case-insensitive server-side over
 * email/name) and is debounced (300 ms) to avoid a request per keystroke.
 *
 * Row structure is deliberately kept generic (`AdminUsersComponent.users`
 * loop → one cell per column, a dedicated `.admin-users__cell--actions` cell
 * per row) so the sibling US of this wave can extend it without a rewrite:
 * - US06.1.3 (role change): slots a `<select>` into the actions cell (or a
 *   dedicated `admin-users__col--role` cell) bound to a new
 *   `onRoleChange(user, role)` handler on this component.
 * - US06.1.4 / US06.1.5 (activate/deactivate): slot buttons into the same
 *   `.admin-users__cell--actions` cell, next to the mobile expand toggle
 *   already living there.
 *
 * No mutation happens in this US — the service only reads
 * `GET /api/admin/users`.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import { AdminUsersService } from './admin-users.service';
import {
  EMPTY_ADMIN_USER_FILTERS,
  type AdminUserDto,
  type AdminUserFilters,
  type AdminUserRoleFilter,
  type AdminUserStatusFilter,
} from './admin-user.model';

/** Debounce delay for the free-text search filter, in milliseconds. */
const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'piv-admin-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, TranslocoPipe],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  protected readonly service = inject(AdminUsersService);

  protected readonly skeletonPlaceholders = [0, 1, 2, 3, 4];
  protected readonly filters = signal<AdminUserFilters>({ ...EMPTY_ADMIN_USER_FILTERS });

  /** Ids of rows currently expanded (mobile-only detail row — see template/SCSS). */
  private readonly expandedIds = signal<ReadonlySet<number>>(new Set());

  private readonly searchInput$ = new Subject<string>();

  readonly users = this.service.users;
  readonly loading = this.service.loading;
  readonly loadError = this.service.loadError;
  readonly page = this.service.page;
  readonly totalPages = this.service.totalPages;
  readonly totalElements = this.service.totalElements;

  /** 1-indexed first row number of the current page, for the "Utilisateurs 1-20 sur 47" display. */
  readonly rangeStart = computed(() => (this.totalElements() === 0 ? 0 : this.page() * this.service.size() + 1));
  /** 1-indexed last row number of the current page. */
  readonly rangeEnd = computed(() => Math.min((this.page() + 1) * this.service.size(), this.totalElements()));

  constructor() {
    this.searchInput$
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.load(0));
  }

  ngOnInit(): void {
    this.load(0);
  }

  load(page: number): void {
    this.service.load(page, this.filters()).subscribe();
  }

  isEmpty(): boolean {
    return !this.loading() && !this.loadError() && this.users().length === 0;
  }

  onSearchInput(value: string): void {
    this.filters.update(f => ({ ...f, search: value }));
    this.searchInput$.next(value);
  }

  onRoleChange(value: AdminUserRoleFilter): void {
    this.filters.update(f => ({ ...f, role: value }));
    this.load(0);
  }

  onStatusChange(value: AdminUserStatusFilter): void {
    this.filters.update(f => ({ ...f, status: value }));
    this.load(0);
  }

  /** Clears every filter and reloads from page 0 — bound to the empty-state "Réinitialiser" button. */
  resetFilters(): void {
    this.filters.set({ ...EMPTY_ADMIN_USER_FILTERS });
    // Keep the debounce pipeline's distinctUntilChanged state in sync so a
    // subsequent identical search term is not silently swallowed.
    this.searchInput$.next('');
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

  /** Display name for a row — falls back to the email when both name parts are null. */
  displayName(user: AdminUserDto): string {
    const parts = [user.firstName, user.lastName].filter((p): p is string => !!p && p.trim() !== '');
    return parts.length > 0 ? parts.join(' ') : user.email;
  }

  /** Role badge/select CSS modifier — 'admin' | 'user' | 'other' (unexpected backend value). */
  roleModifier(role: string): 'admin' | 'user' | 'other' {
    if (role === 'ROLE_ADMIN') {
      return 'admin';
    }
    if (role === 'ROLE_USER') {
      return 'user';
    }
    return 'other';
  }

  /** i18n key for a role badge — falls back to a generic label for unknown values. */
  roleLabelKey(role: string): string {
    return `admin.users.list.role.${this.roleModifier(role)}`;
  }

  /** i18n key for a status badge, keyed on the 3 synthetic status values. */
  statusLabelKey(status: AdminUserDto['status']): string {
    switch (status) {
      case 'ACTIVE':
        return 'admin.users.list.status.active';
      case 'INACTIVE':
        return 'admin.users.list.status.inactive';
      case 'BLOCKED':
        return 'admin.users.list.status.blocked';
    }
  }

  isExpanded(id: number): boolean {
    return this.expandedIds().has(id);
  }

  toggleExpand(id: number): void {
    this.expandedIds.update(ids => {
      const next = new Set(ids);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }
}
