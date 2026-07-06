/**
 * SessionsListComponent — US02.2.3: list the current user's active sessions
 * (device, IP, created/expires dates) and let them revoke one, or all but
 * the current one.
 *
 * Route: `/account/security/sessions` — any authenticated user (no extra
 * guard beyond the shell's `authMatchGuard`: every user only ever sees and
 * revokes their own sessions, resolved server-side from the bearer token).
 *
 * States: loading (skeleton rows), error (message + retry button), and the
 * sessions table — collapses to a card list below 768px via CSS
 * (`sessions-list.component.scss`). The empty state ("Aucune autre session
 * active") is evaluated on *other* sessions only — the current session never
 * counts towards emptiness, and is always shown on its own row.
 *
 * The current session is marked both visually (badge) and textually (never
 * color/icon-only) and has no revoke button — the API also independently
 * rejects revoking the current session (403), this is defence-in-depth on
 * the UI side only.
 *
 * Revoking a session (individually, or "revoke all others") requires
 * confirmation first via the shared `ConfirmDialogComponent` — the API call
 * only happens after the user confirms. Success removes the session(s) from
 * the list optimistically and shows a success toast; failure restores the
 * previous list and shows an error toast (the session stays visible).
 */
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SessionsService } from './session.service';
import type { SessionDto } from './session.model';
import { formatSessionDateTime } from './session-date.util';
import { ToastService } from '../../../../shared/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog.component';

/** Pending confirmation target: a single session, or the "revoke all others" bulk action. */
type ConfirmTarget = { kind: 'one'; session: SessionDto } | { kind: 'all' } | null;

@Component({
  selector: 'piv-sessions-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, ConfirmDialogComponent],
  templateUrl: './sessions-list.component.html',
  styleUrl: './sessions-list.component.scss',
})
export class SessionsListComponent implements OnInit {
  protected readonly service = inject(SessionsService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  /** Active Transloco lang as a signal — read by the date/aria-label helpers so they stay reactive to language switches. */
  private readonly lang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });

  private readonly confirmTarget = signal<ConfirmTarget>(null);

  protected readonly skeletonPlaceholders = [0, 1, 2];

  readonly loading = this.service.loading;
  readonly loadError = this.service.loadError;

  /** The session backing the current request, or null if the list hasn't loaded / is empty (should not happen per contract). */
  readonly currentSession = computed<SessionDto | null>(
    () => this.service.sessions().find(s => s.isCurrent) ?? null
  );

  /** All sessions other than the current one — the only ones counted for the empty state and offered for revocation. */
  readonly otherSessions = computed<SessionDto[]>(() => this.service.sessions().filter(s => !s.isCurrent));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.service.loadSessions().subscribe();
  }

  /** True once loaded without error and there are no *other* active sessions — the current session never counts. */
  isEmpty(): boolean {
    return !this.loading() && !this.loadError() && this.otherSessions().length === 0;
  }

  /** Device label with the i18n fallback applied — never renders an empty cell. */
  deviceLabel(session: SessionDto): string {
    this.lang();
    return session.device ?? this.transloco.translate('account.sessions.list.unknown_device');
  }

  /** Locale-aware formatting of an ISO-8601 instant, reactive to the active Transloco lang. */
  formatDate(iso: string): string {
    return formatSessionDateTime(iso, this.lang());
  }

  /** Contextual aria-label for a row's revoke button — required per AC (multiple identical-looking buttons in the table). */
  revokeAriaLabel(session: SessionDto): string {
    this.lang();
    return this.transloco.translate('account.sessions.list.revoke_aria', {
      device: this.deviceLabel(session),
      date: this.formatDate(session.createdAt),
    });
  }

  isConfirmOpen(): boolean {
    return this.confirmTarget() !== null;
  }

  confirmTitleKey(): string {
    return this.confirmTarget()?.kind === 'all'
      ? 'account.sessions.confirm.title_all'
      : 'account.sessions.confirm.title_one';
  }

  confirmMessageKey(): string {
    return this.confirmTarget()?.kind === 'all'
      ? 'account.sessions.confirm.message_all'
      : 'account.sessions.confirm.message_one';
  }

  onRevoke(session: SessionDto): void {
    this.confirmTarget.set({ kind: 'one', session });
  }

  onRevokeAllOthers(): void {
    this.confirmTarget.set({ kind: 'all' });
  }

  onConfirm(): void {
    const target = this.confirmTarget();
    this.confirmTarget.set(null);
    if (!target) {
      return;
    }
    if (target.kind === 'one') {
      this.runRevoke(target.session);
    } else {
      this.runRevokeAllOthers();
    }
  }

  onCancelConfirm(): void {
    this.confirmTarget.set(null);
  }

  private runRevoke(session: SessionDto): void {
    // `{ id }` is passed even though the translated string doesn't interpolate it —
    // ToastService.show() deduplicates on (messageKey, params) together (see its
    // TSDoc). Without a per-session param here, revoking two different sessions
    // within the 8s auto-dismiss window would collapse into a single toast and
    // silently swallow the second revocation's success feedback (same pitfall as
    // AdminUsersComponent's role/status success toasts).
    this.service.revoke(session).subscribe({
      next: () => this.toast.show('account.sessions.toast.revoked', 'info', { id: session.id }),
      error: () => this.toast.show('account.sessions.toast.revoke_error', 'error', { id: session.id }),
    });
  }

  private runRevokeAllOthers(): void {
    this.service.revokeAllOthers().subscribe({
      next: () => this.toast.show('account.sessions.toast.revoked_all', 'info'),
      error: () => this.toast.show('account.sessions.toast.revoke_all_error', 'error'),
    });
  }
}
