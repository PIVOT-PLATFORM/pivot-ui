/**
 * TrustedDevicesListComponent — US01.4.2: list the current user's trusted
 * devices (device, IP, trusted-since/last-seen dates) and let them revoke one.
 *
 * Route: `/account/security/devices` — any authenticated user (no extra guard
 * beyond the shell's `authMatchGuard`: every user only ever sees and revokes
 * their own devices, resolved server-side from the bearer token).
 *
 * States: loading (skeleton rows), error (message + retry button), and the
 * devices table — collapses to a card list below 768px via CSS
 * (`trusted-devices-list.component.scss`). The empty state ("Aucun autre
 * appareil de confiance") is evaluated on *other* devices only — the current
 * device never counts towards emptiness, and is always shown on its own row.
 *
 * The current device is marked both visually (badge) and textually (never
 * color/icon-only) and has no revoke button — the API also independently
 * rejects revoking the current device (403), this is defence-in-depth on the
 * UI side only.
 *
 * Unlike the sessions screen (US02.2.3), there is no bulk "revoke all others"
 * endpoint for devices — only per-row revoke is offered.
 *
 * Revoking a device requires confirmation first via the shared
 * `ConfirmDialogComponent` — the API call only happens after the user
 * confirms. Success removes the device from the list optimistically and
 * shows a success toast; failure restores the previous list and shows an
 * error toast (the device stays visible).
 */
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TrustedDevicesService } from './trusted-device.service';
import type { TrustedDeviceDto } from './trusted-device.model';
import { formatTrustedDeviceDateTime } from './trusted-device-date.util';
import { ToastService } from '../../../../shared/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'piv-trusted-devices-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, ConfirmDialogComponent],
  templateUrl: './trusted-devices-list.component.html',
  styleUrl: './trusted-devices-list.component.scss',
})
export class TrustedDevicesListComponent implements OnInit {
  protected readonly service = inject(TrustedDevicesService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  /** Active Transloco lang as a signal — read by the date/aria-label helpers so they stay reactive to language switches. */
  private readonly lang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });

  /** Device pending revoke confirmation, or null when the confirm dialog is closed. */
  private readonly confirmTarget = signal<TrustedDeviceDto | null>(null);

  protected readonly skeletonPlaceholders = [0, 1, 2];

  readonly loading = this.service.loading;
  readonly loadError = this.service.loadError;

  /** The device backing the current request, or null if the list hasn't loaded / is empty (should not happen per contract). */
  readonly currentDevice = computed<TrustedDeviceDto | null>(
    () => this.service.devices().find(d => d.isCurrent) ?? null
  );

  /** All devices other than the current one — the only ones counted for the empty state and offered for revocation. */
  readonly otherDevices = computed<TrustedDeviceDto[]>(() => this.service.devices().filter(d => !d.isCurrent));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.service.loadDevices().subscribe();
  }

  /** True once loaded without error and there are no *other* trusted devices — the current device never counts. */
  isEmpty(): boolean {
    return !this.loading() && !this.loadError() && this.otherDevices().length === 0;
  }

  /** Device label with the i18n fallback applied — never renders an empty cell. */
  deviceLabel(device: TrustedDeviceDto): string {
    this.lang();
    return device.device ?? this.transloco.translate('account.devices.list.unknown_device');
  }

  /** Locale-aware formatting of an ISO-8601 instant, reactive to the active Transloco lang. */
  formatDate(iso: string): string {
    return formatTrustedDeviceDateTime(iso, this.lang());
  }

  /** Contextual aria-label for a row's revoke button — required per AC (multiple identical-looking buttons in the table). */
  revokeAriaLabel(device: TrustedDeviceDto): string {
    this.lang();
    return this.transloco.translate('account.devices.list.revoke_aria', {
      device: this.deviceLabel(device),
      date: this.formatDate(device.createdAt),
    });
  }

  isConfirmOpen(): boolean {
    return this.confirmTarget() !== null;
  }

  onRevoke(device: TrustedDeviceDto): void {
    this.confirmTarget.set(device);
  }

  onConfirm(): void {
    const target = this.confirmTarget();
    this.confirmTarget.set(null);
    if (!target) {
      return;
    }
    this.service.revoke(target).subscribe({
      next: () => this.toast.show('account.devices.toast.revoked', 'info'),
      error: () => this.toast.show('account.devices.toast.revoke_error', 'error'),
    });
  }

  onCancelConfirm(): void {
    this.confirmTarget.set(null);
  }
}
