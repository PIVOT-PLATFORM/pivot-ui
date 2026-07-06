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
 * - US06.1.3 (role change, implemented here): a `<select>` in the actions
 *   cell, bound to `onRoleSelect(user, value, selectEl)` — deliberately not
 *   named `onRoleChange` since that name is already taken by the *filter*
 *   role handler above. Picking a different role opens a confirmation
 *   dialog (`ConfirmDialogComponent`, `role="dialog"` per this US's AC, vs.
 *   the `alertdialog` used by the module deactivate flow) before any API
 *   call — `AdminUsersService.changeRole()` is only invoked on confirm.
 * - US06.1.4 / US06.1.5 (deactivate/reactivate, implemented here): a single
 *   status-toggle `<button>` in the actions cell — "Désactiver" on `ACTIVE`
 *   rows, "Réactiver" on `INACTIVE` rows, mutually exclusive by construction
 *   (no button at all on `BLOCKED` rows, out of scope for this pair of US).
 *   Both directions share one code path: one endpoint
 *   (`PATCH /api/admin/users/{id}/status`), one `status` field,
 *   `AdminUsersService.changeStatus()` only. Like the role select, clicking
 *   the button never mutates state directly — it opens a confirmation dialog
 *   first (`role="alertdialog"` for deactivation — destructive, logs the
 *   user out immediately — vs. the lighter `role="dialog"` for reactivation)
 *   and the API call only happens on confirm.
 *
 * The role `<select>` uses a plain `[value]`/`(change)` binding rather than
 * `[ngModel]` — combining `[disabled]` with `ngModel` on the same element is
 * avoided elsewhere in this component for the filter fieldset (see the HTML
 * template comment) and the same CVA/binding conflict would apply here.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AdminUsersService } from './admin-users.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import {
  EMPTY_ADMIN_USER_FILTERS,
  isAdminUserRole,
  type AdminUserDto,
  type AdminUserFilters,
  type AdminUserRole,
  type AdminUserRoleFilter,
  type AdminUserStatusFilter,
  type AdminUserToggleableStatus,
} from './admin-user.model';

/** Debounce delay for the free-text search filter, in milliseconds. */
const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'piv-admin-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, TranslocoPipe, ConfirmDialogComponent],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  protected readonly service = inject(AdminUsersService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  protected readonly skeletonPlaceholders = [0, 1, 2, 3, 4];
  protected readonly filters = signal<AdminUserFilters>({ ...EMPTY_ADMIN_USER_FILTERS });

  /** Ids of rows currently expanded (mobile-only detail row — see template/SCSS). */
  private readonly expandedIds = signal<ReadonlySet<number>>(new Set());

  /** Row awaiting role-change confirmation, or null when the dialog is closed. */
  private readonly pendingRoleChange = signal<{ user: AdminUserDto; newRole: AdminUserRole } | null>(null);
  /**
   * Native `<select>` element behind the pending confirmation, kept only to
   * reset its visually-picked-but-unconfirmed value back to the current role
   * on cancel — the browser already mutated the DOM on `(change)` before
   * Angular's binding can be re-evaluated, and re-evaluating `[value]` with
   * the same `user.role` string it already holds would not re-trigger a DOM
   * write (Angular only writes on a dirty check against the last value).
   */
  private pendingRoleSelectEl: HTMLSelectElement | null = null;

  /** Row awaiting status-change (deactivate/reactivate) confirmation, or null when the dialog is closed. */
  private readonly pendingStatusChange = signal<{ user: AdminUserDto; newStatus: AdminUserToggleableStatus } | null>(
    null
  );

  /** Reactive current UI language — re-evaluates confirm-dialog copy on language switch (see NavbarComponent.themeLabel). */
  private readonly lang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });

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

  /** True while the role-change confirmation dialog should be shown. */
  isRoleConfirmOpen(): boolean {
    return this.pendingRoleChange() !== null;
  }

  /**
   * Confirm-dialog title — the literal question required by the AC
   * ("Changer le rôle de [nom] de USER vers ADMIN ?"), built from the same
   * translated role nouns already used for the badge/filter (`admin.users.list.role.*`)
   * rather than duplicating "Administrateur"/"Utilisateur" under a second key.
   */
  roleConfirmTitle(): string {
    this.lang();
    const pending = this.pendingRoleChange();
    if (!pending) {
      return '';
    }
    return this.transloco.translate('admin.users.role.confirm.title', {
      name: this.displayName(pending.user),
      from: this.transloco.translate(this.roleLabelKey(pending.user.role)),
      to: this.transloco.translate(this.roleLabelKey(pending.newRole)),
    });
  }

  /**
   * Handles the role `<select>`'s native `change` event. Never mutates state
   * directly — only opens the confirmation dialog; the actual API call is
   * deferred to {@link confirmRoleChange}. A no-op re-selection of the
   * current role (or, defensively, an unexpected value) resets the `<select>`
   * and returns without opening the dialog.
   */
  onRoleSelect(user: AdminUserDto, value: string, selectEl: HTMLSelectElement): void {
    if (!isAdminUserRole(value) || value === user.role) {
      selectEl.value = user.role;
      return;
    }
    this.pendingRoleSelectEl = selectEl;
    this.pendingRoleChange.set({ user, newRole: value });
  }

  /** Applies the pending role change — only called after the admin confirms the dialog. */
  confirmRoleChange(): void {
    const pending = this.pendingRoleChange();
    this.pendingRoleChange.set(null);
    this.pendingRoleSelectEl = null;
    if (!pending) {
      return;
    }
    const { user, newRole } = pending;
    const name = this.displayName(user);
    this.service.changeRole(user, newRole).subscribe({
      next: () => this.toast.show('admin.users.role.toast.updated', 'info'),
      error: () => this.toast.show(this.roleErrorToastKey(user.id), 'error', { name }),
    });
  }

  /** Cancels the pending role change and resets the `<select>` back to the current role. */
  cancelRoleChange(): void {
    const pending = this.pendingRoleChange();
    if (this.pendingRoleSelectEl && pending) {
      this.pendingRoleSelectEl.value = pending.user.role;
    }
    this.pendingRoleChange.set(null);
    this.pendingRoleSelectEl = null;
  }

  /** i18n key for the role-change error toast, classified from the failed request (see `AdminUserRoleChangeErrorKind`). */
  private roleErrorToastKey(id: number): string {
    switch (this.service.roleChangeError(id)) {
      case 'self-demotion':
        return 'admin.users.role.toast.self_demotion';
      case 'invalid-role':
        return 'admin.users.role.toast.invalid_role';
      case 'not-found':
        return 'admin.users.role.toast.not_found';
      default:
        return 'admin.users.role.toast.error';
    }
  }

  /** True while the status-change (deactivate/reactivate) confirmation dialog should be shown. */
  isStatusConfirmOpen(): boolean {
    return this.pendingStatusChange() !== null;
  }

  /**
   * ARIA role of the status-change confirmation dialog — `alertdialog`
   * (destructive: the user is logged out of every session immediately) for
   * deactivation, the lighter `dialog` for reactivation, per this US's AC.
   */
  statusConfirmRole(): 'dialog' | 'alertdialog' {
    return this.pendingStatusChange()?.newStatus === 'INACTIVE' ? 'alertdialog' : 'dialog';
  }

  statusConfirmTitle(): string {
    const pending = this.pendingStatusChange();
    return pending ? this.statusConfirmText('title', { name: this.displayName(pending.user) }) : '';
  }

  statusConfirmMessage(): string {
    return this.statusConfirmText('message');
  }

  statusConfirmConfirmLabel(): string {
    return this.statusConfirmText('confirm');
  }

  statusConfirmCancelLabel(): string {
    return this.statusConfirmText('cancel');
  }

  /**
   * Handles the row status-toggle button's click. The target status is
   * derived from the user's current one (`ACTIVE` → `INACTIVE`, `INACTIVE` →
   * `ACTIVE` — mutually exclusive by construction, only one button ever
   * renders per row, see the template). Never mutates state directly — only
   * opens the confirmation dialog; the actual API call is deferred to
   * {@link confirmStatusChange}.
   */
  onStatusToggle(user: AdminUserDto): void {
    const newStatus = this.toggleTargetStatus(user.status);
    if (!newStatus) {
      return;
    }
    this.pendingStatusChange.set({ user, newStatus });
  }

  /** Applies the pending status change — only called after the admin confirms the dialog. */
  confirmStatusChange(): void {
    const pending = this.pendingStatusChange();
    this.pendingStatusChange.set(null);
    if (!pending) {
      return;
    }
    const { user, newStatus } = pending;
    const name = this.displayName(user);
    const successKey =
      newStatus === 'INACTIVE' ? 'admin.users.status.toast.deactivated' : 'admin.users.status.toast.reactivated';
    this.service.changeStatus(user, newStatus).subscribe({
      next: () => this.toast.show(successKey, 'info'),
      error: () => this.toast.show(this.statusErrorToastKey(user.id), 'error', { name }),
    });
  }

  /**
   * Cancels the pending status change. Unlike {@link cancelRoleChange}, no
   * DOM revert is needed — the status button's label/text is derived
   * entirely from `user.status`, not from a bound `<select>` the browser
   * may have mutated ahead of Angular.
   */
  cancelStatusChange(): void {
    this.pendingStatusChange.set(null);
  }

  /** i18n key for the status-change error toast, classified from the failed request (see `AdminUserStatusChangeErrorKind`). */
  private statusErrorToastKey(id: number): string {
    switch (this.service.statusChangeError(id)) {
      case 'self-deactivation':
        return 'admin.users.status.toast.self_deactivation';
      case 'invalid-status':
        return 'admin.users.status.toast.invalid_status';
      case 'not-found':
        return 'admin.users.status.toast.not_found';
      default:
        return 'admin.users.status.toast.error';
    }
  }

  /** `ACTIVE` → `INACTIVE`, `INACTIVE` → `ACTIVE`; `BLOCKED` (out of scope) → `null`. */
  private toggleTargetStatus(status: AdminUserDto['status']): AdminUserToggleableStatus | null {
    switch (status) {
      case 'ACTIVE':
        return 'INACTIVE';
      case 'INACTIVE':
        return 'ACTIVE';
      default:
        return null;
    }
  }

  /** Translates a status-confirm-dialog key for the pending action ('' when no confirmation is pending). */
  private statusConfirmText(suffix: 'title' | 'message' | 'confirm' | 'cancel', params?: Record<string, string>): string {
    this.lang();
    const pending = this.pendingStatusChange();
    if (!pending) {
      return '';
    }
    const prefix = pending.newStatus === 'INACTIVE' ? 'deactivate' : 'reactivate';
    return this.transloco.translate(`admin.users.status.confirm.${prefix}.${suffix}`, params);
  }
}
