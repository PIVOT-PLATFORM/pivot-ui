import { Injectable } from '@angular/core';

/**
 * Computes browser fingerprint and device name for MFA and audit purposes.
 *
 * Extracted from AuthService (US-AUTH-002) to keep AuthService focused on
 * session lifecycle only.
 */
@Injectable({ providedIn: 'root' })
export class DeviceService {

  /** Ordered token→label table : premier token présent dans l'UA gagne. */
  private static readonly BROWSERS: ReadonlyArray<readonly [string, string]> = [
    ['Firefox', 'Firefox'],
    ['Edg', 'Edge'],
    ['Chrome', 'Chrome'],
    ['Safari', 'Safari'],
  ];

  private static readonly OPERATING_SYSTEMS: ReadonlyArray<readonly [string, string]> = [
    ['Windows', 'Windows'],
    ['Mac', 'macOS'],
    ['Linux', 'Linux'],
    ['Android', 'Android'],
    ['iOS', 'iOS'],
  ];

  /** Returns a stable 64-char browser fingerprint from navigator metadata. */
  getDeviceFingerprint(): string {
    const nav = globalThis.navigator;
    const raw = `${nav.userAgent}|${nav.language}|${globalThis.screen.width}x${globalThis.screen.height}|${nav.hardwareConcurrency}`;
    return btoa(raw).substring(0, 64);
  }

  /** Returns a human-readable device label e.g. "Chrome · Windows". */
  getDeviceName(): string {
    const ua = globalThis.navigator.userAgent;
    const browser = DeviceService.match(ua, DeviceService.BROWSERS, 'Navigateur');
    const os = DeviceService.match(ua, DeviceService.OPERATING_SYSTEMS, 'OS inconnu');
    return `${browser} · ${os}`;
  }

  /** Returns the label of the first table entry whose token is in `ua`, else `fallback`. */
  private static match(ua: string, table: ReadonlyArray<readonly [string, string]>, fallback: string): string {
    const hit = table.find(([token]) => ua.includes(token));
    return hit ? hit[1] : fallback;
  }
}
