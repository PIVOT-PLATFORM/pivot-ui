/**
 * Models for the "Changer son e-mail" feature (US02.2.2).
 *
 * Backend contract confirmed against `pivot-core` PR #131 (final, frontend contract
 * section) :
 * - POST /api/account/email          — authentifié, body `RequestEmailChangeBody`
 *   → toujours 202 Accepted, corps vide, QUE `newEmail` soit déjà pris ou non
 *   (anti-énumération — voir `change-email.component.ts` pour le détail du traitement
 *   frontend). 401 si mot de passe actuel incorrect. 429 `{"code":"RATE_LIMITED"}` si
 *   plus de 3 tentatives/heure pour l'utilisateur.
 * - GET  /api/account/email/confirm?token=... — public (pas d'authentification,
 *   ouvert depuis le lien email). 200 vide si succès. 400/410/409 avec un corps
 *   `EmailChangeConfirmErrorBody` selon {@link EmailChangeConfirmErrorCode}.
 */

/** Body attendu par `POST /api/account/email`. */
export interface RequestEmailChangeBody {
  newEmail: string;
  currentPassword: string;
}

/**
 * Codes d'erreur renvoyés par `GET /api/account/email/confirm` (jamais par le POST,
 * qui ne renvoie qu'un statut HTTP nu sans corps sur ses cas d'erreur 401/400/429).
 */
export type EmailChangeConfirmErrorCode =
  | 'EMAIL_CHANGE_TOKEN_INVALID'
  | 'EMAIL_CHANGE_TOKEN_EXPIRED'
  | 'EMAIL_CHANGE_TOKEN_ALREADY_USED'
  | 'EMAIL_CHANGE_TARGET_TAKEN'
  | 'RATE_LIMITED';

/** Corps d'erreur renvoyé par `GET /api/account/email/confirm` sur 400/409/410/429. */
export interface EmailChangeConfirmErrorBody {
  code: EmailChangeConfirmErrorCode;
  retryAfterSeconds?: number;
}

/** État affiché par `EmailConfirmComponent` pendant/après l'appel de confirmation. */
export type EmailConfirmState =
  | 'loading'
  | 'success'
  | 'invalid'
  | 'expired'
  | 'already_used'
  | 'target_taken'
  | 'rate_limited'
  | 'error';
