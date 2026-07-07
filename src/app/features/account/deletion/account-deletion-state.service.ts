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
 *
 * That "without needing an extra network call" self-expiry only actually
 * fires because of the `now` signal + constructor `effect()` below — see
 * their doc for why. Without them, `pending` (a `computed()`) would only ever
 * be re-evaluated when `_pending` itself changes (`record()`/`clear()`), so a
 * tab left open across the exact `effectiveDeletionDate` boundary would keep
 * showing a stale, already-expired banner indefinitely (found during a
 * retrospective Gate 4 review of #83 — fixed here, same pattern already used
 * by `ExportComponent.rateLimitedUntil` for the identical class of problem).
 */
import { Injectable, computed, effect, signal } from '@angular/core';

export interface PendingAccountDeletion {
  /** ISO-8601 Instant — end of the grace period, when anonymization runs. */
  effectiveDeletionDate: string;
}

const STORAGE_KEY = 'pivot_account_deletion_pending';

/**
 * `setTimeout`'s delay is internally a 32-bit signed int in both browsers and
 * Node — a delay above this fires (near-)immediately instead of throwing, per
 * spec/engine behavior (see MDN "Delay restrictions"). US02.2.4's grace period
 * example (30 days ≈ 2.59e9 ms) exceeds this, so a single `setTimeout` for
 * "wake up exactly at expiry" cannot be trusted for realistic grace periods —
 * {@link AccountDeletionStateService}'s constructor chains timers capped at
 * this value instead of scheduling one unbounded delay.
 */
const MAX_TIMEOUT_MS = 2_147_483_647;

@Injectable({ providedIn: 'root' })
export class AccountDeletionStateService {
  private readonly _pending = signal<PendingAccountDeletion | null>(this.readFromStorage());

  /**
   * Reactive clock read by {@link pending}. `computed()` only recomputes when a
   * *signal* it reads changes — `Date.now()` alone is not a signal, so without
   * this field `pending` would memoize its last result forever once read, and
   * never notice `effectiveDeletionDate` elapsing during a long-lived tab.
   * Bumped exactly once, right when the current pending deletion's grace period
   * elapses (see the constructor's `effect`), mirroring
   * `ExportComponent.rateLimitedUntil`'s `now` signal for the same reason.
   */
  private readonly now = signal(Date.now());

  /** `null` when there is no pending deletion, or its grace period has already elapsed. */
  readonly pending = computed<PendingAccountDeletion | null>(() => {
    const value = this._pending();
    if (!value) {
      return null;
    }
    if (Date.parse(value.effectiveDeletionDate) <= this.now()) {
      return null;
    }
    return value;
  });

  constructor() {
    // Schedules a wake-up for exactly when the current pending deletion's grace
    // period elapses, so `pending()` (and anything reading it, e.g. the banner)
    // flips to `null` on its own — not only on the next `record()`/`clear()`
    // call or a full page reload. Chained and capped at MAX_TIMEOUT_MS (see its
    // doc) rather than one `setTimeout(..., delayMs)`, since a realistic grace
    // period (e.g. the US's 30-day example) overflows a single JS timer delay.
    // Reads `Date.now()` (untracked) rather than the `now` signal inside the
    // effect body to avoid the effect re-triggering itself.
    effect(onCleanup => {
      const value = this._pending();
      if (!value) {
        return;
      }
      const targetMs = Date.parse(value.effectiveDeletionDate);
      let timer: ReturnType<typeof setTimeout> | undefined;

      const scheduleWake = (): void => {
        const remaining = targetMs - Date.now();
        if (remaining <= 0) {
          this.now.set(Date.now());
          return;
        }
        timer = setTimeout(() => {
          this.now.set(Date.now());
          scheduleWake();
        }, Math.min(remaining, MAX_TIMEOUT_MS));
      };
      scheduleWake();

      onCleanup(() => clearTimeout(timer));
    });
  }

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
