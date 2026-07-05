/**
 * ExportComponent — "Demander mon export" page (US02.3.1, RGPD Art. 20).
 *
 * State machine (driven by `GET /account/export/status`, per pivot-core PR #133):
 * - `initialLoading` → first status fetch in flight.
 * - `loadError` → status fetch failed, retry affordance shown.
 * - `submitting` → `POST /account/export` in flight (button disabled + spinner).
 * - `status().status === 'PENDING' | 'PROCESSING'` → "Demande reçue" panel,
 *   polled every {@link POLL_INTERVAL_MS} until it settles to READY/FAILED.
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
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { interval, switchMap, takeWhile, tap } from 'rxjs';
import { ToastService } from '../../../../shared/toast/toast.service';
import { ExportService } from '../../service/export.service';
import type { ExportStatusResponse } from '../../service/export.model';

/** Poll interval while a request is PENDING/PROCESSING (ms). */
const POLL_INTERVAL_MS = 5000;
/** Safety cap on poll attempts (5 min at the default interval) — avoids indefinite
 *  polling if the backend `@Async` job never settles. */
const MAX_POLL_ATTEMPTS = 60;

const IN_FLIGHT_STATUSES: ReadonlySet<ExportStatusResponse['status']> = new Set(['PENDING', 'PROCESSING']);

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
    return s !== undefined && IN_FLIGHT_STATUSES.has(s);
  });

  /** Non-null (and strictly in the future) while a new request is rate-limited. */
  readonly rateLimitedUntil = computed<Date | null>(() => {
    const iso = this.status()?.nextAvailableAt;
    if (!iso) return null;
    const date = new Date(iso);
    return date.getTime() > Date.now() ? date : null;
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
        if (IN_FLIGHT_STATUSES.has(res.status)) this.pollUntilSettled();
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

  /** Polls `GET /status` until the request leaves PENDING/PROCESSING, or the attempt cap is reached. */
  private pollUntilSettled(): void {
    interval(POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => this.exportService.getStatus()),
        tap(res => this.status.set(res)),
        takeWhile((res, index) => IN_FLIGHT_STATUSES.has(res.status) && index < MAX_POLL_ATTEMPTS - 1, true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private formatHHmm(date: Date): string {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  }
}
