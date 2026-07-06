/**
 * ExportComponent — "Demander mon export" page (US02.3.1, RGPD Art. 20).
 *
 * State machine (driven by `GET /account/export/status`, per pivot-core PR #133):
 * - `initialLoading` → first status fetch in flight.
 * - `loadError` → status fetch failed, retry affordance shown.
 * - `submitting` → `POST /account/export` in flight (button disabled + spinner).
 * - `status().status === 'PENDING' | 'PROCESSING'` → "Demande reçue" panel,
 *   polled via {@link ExportService.pollStatus} until it settles to READY/FAILED.
 * - `rateLimitedUntil()` non-null → button kept accessible (`aria-disabled`,
 *   not natively `disabled`) so keyboard/AT users can still discover the
 *   "Prochain export disponible à HH:MM" reason via `aria-describedby`
 *   (same pattern as the navbar's "coming soon" dropdown items).
 *
 * The actual archive is never downloaded from this page: the ready archive is
 * only reachable via the authenticated link emailed to the user, landing on
 * {@link ExportDownloadComponent}. `GET /status` intentionally never exposes
 * the raw `exportToken`.
 */
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { tap } from 'rxjs';
import { ToastService } from '../../../../shared/toast/toast.service';
import { ExportService } from '../../service/export.service';
import { IN_FLIGHT_EXPORT_STATUSES } from '../../service/export.model';
import type { ExportStatusResponse } from '../../service/export.model';

@Component({
  selector: 'piv-export',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './export.component.html',
  styleUrl: './export.component.scss',
})
export class ExportComponent {
  private readonly exportService = inject(ExportService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly location = inject(Location);

  /** True while the initial `GET /status` is in flight (first paint only). */
  readonly initialLoading = signal(true);
  /** True if the initial status fetch failed — shows a retry affordance. */
  readonly loadError = signal(false);
  /** True while `POST /account/export` is in flight. */
  readonly submitting = signal(false);
  /** Last known server status (`null` only before the first response). */
  readonly status = signal<ExportStatusResponse | null>(null);

  readonly isPending = computed(() => {
    const s = this.status()?.status;
    return s !== undefined && IN_FLIGHT_EXPORT_STATUSES.has(s);
  });

  /**
   * Reactive clock powering {@link rateLimitedUntil}. Bumped exactly once, right
   * when the current `nextAvailableAt` elapses (see the constructor's `effect`),
   * so the button re-enables itself as soon as the rate limit is actually over —
   * not only on the next `status()` change (poll tick / manual reload).
   */
  private readonly now = signal(Date.now());

  /** Non-null (and strictly in the future) while a new request is rate-limited. */
  readonly rateLimitedUntil = computed<Date | null>(() => {
    const iso = this.status()?.nextAvailableAt;
    if (!iso) return null;
    const date = new Date(iso);
    return date.getTime() > this.now() ? date : null;
  });

  /** Drives both the native `disabled` state (submit in flight) and the `aria-disabled` reason. */
  readonly canRequest = computed(
    () =>
      !this.initialLoading() &&
      !this.loadError() &&
      !this.submitting() &&
      !this.isPending() &&
      this.rateLimitedUntil() === null,
  );

  readonly rateLimitedAt = computed(() => {
    const date = this.rateLimitedUntil();
    return date ? this.formatHHmm(date) : '';
  });

  readonly readyExpiresAt = computed(() => {
    const iso = this.status()?.expiresAt;
    return iso ? this.formatHHmm(new Date(iso)) : '';
  });

  /**
   * Transloco key for the visually-hidden `aria-live="polite"` announcement.
   * Every page-state change funnels through this single computed so no
   * transition is silently missed (AC: "changements d'état... aria-live=polite").
   */
  readonly liveKey = computed<string>(() => {
    if (this.submitting()) return 'account.rgpd.export.live.submitting';
    if (this.isPending()) return 'account.rgpd.export.live.received';
    const s = this.status()?.status;
    if (s === 'READY') return 'account.rgpd.export.live.ready';
    if (s === 'FAILED') return 'account.rgpd.export.live.failed';
    if (this.rateLimitedUntil()) return 'account.rgpd.export.live.rate_limited';
    return 'account.rgpd.export.live.idle';
  });

  constructor() {
    this.loadStatus();
    // Schedules a single wake-up for exactly when the current rate limit elapses,
    // so `rateLimitedUntil()`/`canRequest()` flip without waiting for the next
    // status poll or a manual reload. Reads `Date.now()` (untracked) rather than
    // the `now` signal to avoid the effect re-triggering itself.
    effect(onCleanup => {
      const iso = this.status()?.nextAvailableAt;
      if (!iso) return;
      const delayMs = new Date(iso).getTime() - Date.now();
      if (delayMs <= 0) return;
      const timer = setTimeout(() => this.now.set(Date.now()), delayMs);
      onCleanup(() => clearTimeout(timer));
    });
  }

  goBack(): void {
    this.location.back();
  }

  requestExport(): void {
    if (!this.canRequest()) return;
    this.submitting.set(true);

    this.exportService.requestExport().subscribe({
      next: res => {
        this.submitting.set(false);
        this.status.update(prev => ({
          status: 'PENDING',
          requestedAt: res.requestedAt,
          completedAt: null,
          expiresAt: null,
          nextAvailableAt: prev?.nextAvailableAt ?? null,
        }));
        this.pollUntilSettled();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        // 409/429 mean the server's truth diverged from ours (race: another tab,
        // stale status) — resync instead of trusting a generic error message.
        if (err.status === 409) {
          this.toast.show('account.rgpd.export.toast.already_pending', 'error');
          this.refreshStatus();
          return;
        }
        if (err.status === 429) {
          this.toast.show('account.rgpd.export.toast.rate_limited', 'error');
          this.refreshStatus();
          return;
        }
        this.toast.show('account.rgpd.export.toast.error_generic', 'error');
      },
    });
  }

  retryLoad(): void {
    this.loadStatus();
  }

  private loadStatus(): void {
    this.initialLoading.set(true);
    this.loadError.set(false);
    this.exportService.getStatus().subscribe({
      next: res => {
        this.status.set(res);
        this.initialLoading.set(false);
        if (IN_FLIGHT_EXPORT_STATUSES.has(res.status)) this.pollUntilSettled();
      },
      error: () => {
        this.initialLoading.set(false);
        this.loadError.set(true);
      },
    });
  }

  private refreshStatus(): void {
    this.exportService.getStatus().subscribe({ next: res => this.status.set(res) });
  }

  /**
   * Starts (or resumes) polling until the request leaves PENDING/PROCESSING.
   * The polling mechanics (interval, cutoff, attempt cap) live in
   * {@link ExportService.pollStatus} — this only wires the result into local
   * state and ties the subscription to this component's lifetime.
   */
  private pollUntilSettled(): void {
    this.exportService
      .pollStatus()
      .pipe(
        tap(res => this.status.set(res)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private formatHHmm(date: Date): string {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  }
}
