/**
 * Profile models — shape returned/consumed by the account profile endpoints
 * (US02.1.1 — "Voir et éditer son profil", extended by US02.1.2 — "Préférence de langue").
 *
 * Backend contract confirmed against `pivot-core` PR #129 (US02.1.1, merged) and PR #130
 * (US02.1.2):
 * - GET   /api/account/profile          → ProfileDto · 401 if unauthenticated.
 * - PATCH /api/account/profile          → body `UpdateProfileRequest` (firstName/lastName
 *   ONLY) → 200 ProfileDto · 400 `{ error: 'INVALID_NAME' }` (missing/blank/>100 chars) ·
 *   400 `{ error: 'EMAIL_CHANGE_NOT_ALLOWED' }` if the body contains an `email` key at all —
 *   the frontend must therefore NEVER include `email` in the PATCH payload (email edition is
 *   out of scope, see US02.2.2). The same endpoint also accepts an optional `preferredLanguage`
 *   field — see `LanguagePreferenceService` in `core/i18n`, which owns that PATCH call directly
 *   (never mixed with a firstName/lastName save; the two flows stay independent).
 * - POST  /api/account/profile/avatar   → multipart field name `file` (JPEG/PNG/WEBP, ≤ 2 Mo)
 *   → 200 ProfileDto · 400 `{ error: 'AVATAR_INVALID_FORMAT' }` · 400 `{ error: 'AVATAR_TOO_LARGE' }`.
 * - Avatars are served unauthenticated at GET /api/avatars/{tenantId}/{uuid}.{ext} — `avatarUrl`
 *   is already the full, directly-usable URL for a plain `<img src>` (no auth header needed).
 */
import type { SupportedLanguage } from '../../../core/i18n/language';

/** DTO returned by GET/PATCH /api/account/profile and POST .../avatar. */
export interface ProfileDto {
  firstName: string;
  lastName: string;
  email: string;
  /** Full, unauthenticated, directly-usable URL — `null` when no avatar has been uploaded. */
  avatarUrl: string | null;
  /** Mirrors `users.locale` — always present, never `null` (backend contract, PR #130). */
  preferredLanguage: SupportedLanguage;
}

/**
 * PATCH request body. Intentionally has ONLY these two fields — never add `email` here,
 * the backend rejects the whole request with 400 EMAIL_CHANGE_NOT_ALLOWED if it is present
 * (email edition is out of scope of this US, see US02.2.2).
 */
export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
}

/** Error body shape returned by PATCH /api/account/profile on a 400. */
export interface ProfileErrorBody {
  error: 'INVALID_NAME' | 'EMAIL_CHANGE_NOT_ALLOWED' | 'INVALID_PREFERRED_LANGUAGE';
  message?: string;
}

/** Error body shape returned by POST /api/account/profile/avatar on a 400. */
export interface AvatarErrorBody {
  error: 'AVATAR_INVALID_FORMAT' | 'AVATAR_TOO_LARGE';
  message?: string;
}

/** Accepted avatar MIME types (client-side pre-validation — mirrors the backend contract). */
export const AVATAR_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Maximum avatar size in bytes (2 Mo — mirrors the backend contract). */
export const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024;

/** Inline error kind shown under the "Prénom"/"Nom" fields after a failed PATCH. */
export type ProfileSaveErrorKind = 'invalid_name' | 'generic';

/** Inline error kind shown under the avatar field, from client-side checks or a failed POST. */
export type AvatarErrorKind = 'invalid_format' | 'too_large' | 'generic';

/**
 * Initials fallback shown when `avatarUrl` is `null` (AC: "Avatar non défini → retourne null ;
 * frontend utilise l'avatar initiales"). Mirrors `NavbarComponent.initials()` — duplicated
 * intentionally rather than shared, per this codebase's convention for tiny pure functions
 * (see `passwordsMatch` in `register.component.ts`): a cross-feature dependency for a 4-line
 * pure function is not worth the coupling.
 */
export function profileInitials(firstName: string | null | undefined, lastName: string | null | undefined, email: string): string {
  const first = firstName?.[0] ?? '';
  const last = lastName?.[0] ?? '';
  return `${first}${last}`.toUpperCase() || email[0]?.toUpperCase() || '?';
}
