/**
 * TrustedDevicesService — the current user's trusted devices (US01.4.2).
 *
 * Consumes the contract confirmed in pivot-core PR #152 (Gate 4 = 100/100,
 * merged-stable):
 * - GET    /api/auth/devices          → TrustedDeviceDto[], 403 if
 *   unauthenticated (no dedicated 401 in this project — same as every other
 *   authenticated endpoint)
 * - DELETE /api/auth/devices/{id}     → 204 revoked · 404 not owned / already
 *   revoked (indistinguishable by design, no existence leak) · 403 if `id` is
 *   the current device (the UI never offers this action for the current
 *   device, but the API enforces it independently)
 *
 * Unlike `SessionsService`, there is no bulk "revoke all others" endpoint for
 * devices — this service intentionally has no `revokeAllOthers()` /
 * `revokingAll` equivalent.
 *
 * No `userId`/`tenantId` is ever sent by the client — identity is resolved
 * server-side from the bearer token on every call.
 *
 * State is optimistic: `revoke()` removes the device from the local signal
 * immediately, and rolls back to the previous list on error so the device
 * reappears and the caller can show an error toast per the AC.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, tap, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import type { TrustedDeviceDto } from './trusted-device.model';

@Injectable({ providedIn: 'root' })
export class TrustedDevicesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly _devices = signal<TrustedDeviceDto[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadError = signal(false);
  private readonly _revokingIds = signal<Record<number, boolean>>({});

  /** Current device list, as last returned by the backend. */
  readonly devices = this._devices.asReadonly();
  /** True while `GET /api/auth/devices` is in flight. */
  readonly loading = this._loading.asReadonly();
  /** True if the last GET failed — drives the error state + retry button. */
  readonly loadError = this._loadError.asReadonly();

  /** True while a revoke request for this device id is pending. */
  isRevoking(id: number): boolean {
    return this._revokingIds()[id] ?? false;
  }

  /** Fetches the current user's trusted device list. Resets loading/error state. */
  loadDevices(): Observable<TrustedDeviceDto[]> {
    this._loading.set(true);
    this._loadError.set(false);

    return this.http.get<TrustedDeviceDto[]>(`${this.apiUrl}/auth/devices`).pipe(
      tap(devices => {
        this._devices.set(devices);
        this._loading.set(false);
      }),
      catchError(() => {
        this._loading.set(false);
        this._loadError.set(true);
        return of([]);
      })
    );
  }

  /**
   * Revokes a single (non-current) device, optimistically. On failure the
   * device is re-inserted in `createdAt`-descending order and the error is
   * re-thrown so the caller can show an error toast.
   */
  revoke(device: TrustedDeviceDto): Observable<void> {
    const { id } = device;
    this.setRevoking(id, true);
    this.removeFromList(id);

    return this.http.delete<void>(`${this.apiUrl}/auth/devices/${id}`).pipe(
      tap(() => this.setRevoking(id, false)),
      catchError((err: HttpErrorResponse) => {
        this.setRevoking(id, false);
        this.restoreDevice(device);
        return throwError(() => err);
      })
    );
  }

  private removeFromList(id: number): void {
    this._devices.update(list => list.filter(d => d.id !== id));
  }

  private restoreDevice(device: TrustedDeviceDto): void {
    this._devices.update(list => {
      if (list.some(d => d.id === device.id)) {
        return list;
      }
      return [...list, device].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }

  private setRevoking(id: number, value: boolean): void {
    this._revokingIds.update(map => {
      if (!value) {
        if (!(id in map)) {
          return map;
        }
        const next = { ...map };
        delete next[id];
        return next;
      }
      return { ...map, [id]: value };
    });
  }
}
