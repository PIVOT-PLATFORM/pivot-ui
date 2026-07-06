/**
 * Modèle des notifications in-app côté client (US16.1.3 — badge de navigation).
 *
 * Miroir de {@code fr.pivot.notification.dto.UnreadCountResponse} (pivot-core, Enabler
 * EN-NOTIF, PR #160 `feat/en-notif-infrastructure`) — contrat confirmé par lecture directe
 * du diff de cette PR, pas deviné. `count` est un `long` côté Java, sérialisé en `number`
 * JSON standard.
 */
export interface UnreadCountResponse {
  count: number;
}
