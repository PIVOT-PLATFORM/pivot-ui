/**
 * AccountDeletionStateService — persists the "pending account deletion" reminder
 * across page reloads and browser sessions (US02.2.4 AC: "Bannière persistante
 * pendant le délai de grâce").
 *
 * Why localStorage and not a `GET account status` call: per the AC, tokens are
 * revoked the instant deletion is requested and the account then answers 401 to
 * *any* login attempt for the whole grace period — there is no authenticated
 * endpoint left to poll for status, and the pivot-core PR #140 contract does not
 * expose a public one either (by design: PENDING_DELETION accounts must stay
 * invisible/inaccessible). Reading "account status on load" therefore means
 * reading the one fact this browser already knows locally: the
 * `effectiveDeletionDate` returned by the `DELETE /account` call that just
 * succeeded in this same tab.
 *
 * This mirrors the existing `pivot_theme` / `pivot_lang` localStorage usage
 * (ThemeService / NavbarComponent) — a non-sensitive UI preference, not a
 * session credential. **No token, no PII, no password/OTP is ever stored
 * here** — only a future ISO-8601 timestamp — so it does not fall under the
 * CLAUDE.md "access token never in localStorage" rule (that rule targets the
 * bearer token itself, kept in memory only, per AuthService).
 *
 * Self-expiring: once `effectiveDeletionDate` is in the past the account has
 * been anonymized server-side and the reminder no longer applies, so the
 * signal reports `null` (and the stored value is dropped) without needing an
 * extra network call.
 */
import { Injectable, computed, signal } from '@angular/core';

export interface PendingAccountDeletion {
  /** ISO-8601 Instant — end of the grace period, when anonymization runs. */
  effectiveDeletionDate: string;
}

const STORAGE_KEY = 'pivot_account_deletion_pending';

@Injectable({ providedIn: 'root' })
export class AccountDeletionStateService {
  private readonly _pending = signal<PendingAccountDeletion | null>(this.readFromStorage());

  /** `null` when there is no pending deletion, or its grace period has already elapsed. */
  readonly pending = computed<PendingAccountDeletion | null>(() => {
    const value = this._pending();
    if (!value) {
      return null;
    }
    if (Date.parse(value.effectiveDeletionDate) <= Date.now()) {
      return null;
    }
    return value;
  });

  /** Records a just-confirmed deletion so the banner survives reloads/new tabs. */
  record(effectiveDeletionDate: string): void {
    const value: PendingAccountDeletion = { effectiveDeletionDate };
    this._pending.set(value);
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }

  /** Clears the reminder — called once cancellation succeeds (or on manual recovery). */
  clear(): void {
    this._pending.set(null);
    globalThis.localStorage.removeItem(STORAGE_KEY);
  }

  private readFromStorage(): PendingAccountDeletion | null {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof (parsed as { effectiveDeletionDate?: unknown }).effectiveDeletionDate === 'string'
      ) {
        return parsed as PendingAccountDeletion;
      }
    } catch {
      // Malformed value (manual tampering, old format) — ignore, treat as absent.
    }
    return null;
  }
}
