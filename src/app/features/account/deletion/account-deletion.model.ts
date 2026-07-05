/**
 * Types for the US02.2.4 account deletion flow — mirrors the pivot-core
 * contract exactly (pivot-core PR #140, "not yet merged but contract is final").
 */

/**
 * How the current account must confirm its own deletion:
 * - `PASSWORD` — local auth accounts, confirm with the current password.
 * - `OTP` — OIDC/Google-only accounts (no local password), confirm with a
 *   6-digit code emailed on request (10 min TTL).
 */
export type AccountDeletionConfirmationMethod = 'PASSWORD' | 'OTP';

export interface ConfirmationMethodResponse {
  method: AccountDeletionConfirmationMethod;
}

/** Exactly one of the two fields must be sent, matching `confirmation-method`. */
export interface DeleteAccountRequest {
  currentPassword?: string;
  otp?: string;
}

export interface DeleteAccountResponse {
  /** ISO-8601 Instant — end of the grace period, when anonymization runs. */
  effectiveDeletionDate: string;
}

export interface CancelDeletionResponse {
  message: string;
}
