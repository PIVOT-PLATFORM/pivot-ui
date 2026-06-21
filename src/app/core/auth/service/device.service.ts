import { Injectable } from '@angular/core';

/**
 * Computes browser fingerprint and device name for MFA and audit purposes.
 *
 * Extracted from AuthService (US-AUTH-002) to keep AuthService focused on
 * session lifecycle only.
 */
@Injectable({ providedIn: 'root' })
export class DeviceService {

  /** Returns a stable 64-char browser fingerprint from navigator metadata. */
  getDeviceFingerprint(): string {
    const nav = window.navigator;
    const raw = `${nav.userAgent}|${nav.language}|${window.screen.width}x${window.screen.height}|${nav.hardwareConcurrency}`;
    return btoa(raw).substring(0, 64);
  }

  /** Returns a human-readable device label e.g. "Chrome · Windows". */
  getDeviceName(): string {
    const ua = window.navigator.userAgent;
    const browser = ua.includes('Firefox') ? 'Firefox'
      : ua.includes('Edg') ? 'Edge'
      : ua.includes('Chrome') ? 'Chrome'
      : ua.includes('Safari') ? 'Safari'
      : 'Navigateur';
    const os = ua.includes('Windows') ? 'Windows'
      : ua.includes('Mac') ? 'macOS'
      : ua.includes('Linux') ? 'Linux'
      : ua.includes('Android') ? 'Android'
      : ua.includes('iOS') ? 'iOS'
      : 'OS inconnu';
    return `${browser} · ${os}`;
  }
}
