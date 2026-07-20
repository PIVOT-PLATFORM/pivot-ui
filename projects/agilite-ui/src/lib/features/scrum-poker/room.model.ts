/**
 * A planning poker deck identifier (E09 — classic parity, deck choice). Server-owned: the caller
 * may only name one of these three, never supply arbitrary card values.
 */
export type PokerDeck = 'FIBONACCI' | 'FIBONACCI_SIMPLE' | 'TSHIRT';

/**
 * Request body for `POST /api/agilite/poker/rooms` (US09.1.1).
 *
 * `expirationHours` is intentionally omitted from this minimal UI — the backend applies its
 * configured default (24h) when absent; the field exists server-side (1-168h) for a future US
 * to surface, not this one. `deck`/`facilitatorVotes`/`facilitatorName` (E09) are all optional —
 * the backend defaults to `FIBONACCI`, `true`, and a generated name respectively when absent.
 */
export interface CreateRoomRequest {
  readonly name: string;
  readonly deck?: PokerDeck;
  readonly facilitatorVotes?: boolean;
  readonly facilitatorName?: string;
}

/**
 * API response shape for a planning poker room, returned by both `POST /api/agilite/poker/rooms`
 * and `GET /api/agilite/poker/rooms/{roomId}` (US09.1.1).
 */
export interface RoomResponse {
  readonly id: number;
  readonly name: string;
  readonly inviteCode: string;
  readonly sequence: string;
  readonly cardValues: readonly string[];
  readonly facilitatorUserId: number;
  /** Whether the facilitator also casts a vote in this room (E09). */
  readonly facilitatorVotes: boolean;
  readonly active: boolean;
  readonly createdAt: string;
  readonly expiresAt: string;
  /** STOMP destination this room's participants subscribe to (ADR-026 §2, US09.1.2). */
  readonly wsTopic: string;
  /**
   * The facilitator's own room-scoped WebSocket access token (US09.2.1) — present only on the
   * `POST` (creation) response, `undefined`/absent on `GET`. Lets the facilitator open the same
   * STOMP link as a joining participant ({@link RoomWsService}) without a separate join-by-code
   * round trip against their own room.
   */
  readonly accessToken?: string;
}

/**
 * RFC 7807 Problem Detail shape returned by the backend on validation/auth failures, with the
 * PIVOT-specific `code` extension property (e.g. `INVALID_NAME`, `INVALID_CODE`).
 */
export interface ProblemDetailResponse {
  readonly type?: string;
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly code?: string;
}

/**
 * A participant's role in a room (E09 — classic parity). Only a `JOUEUR` casts votes; a
 * `VISITEUR` watches (present in the roster, never counted as a voter). Mirrors the backend
 * `ParticipantRole`; the server defaults to `JOUEUR` when absent/unknown.
 */
export type ParticipantRole = 'JOUEUR' | 'VISITEUR';

/**
 * Request body for `POST /api/agilite/poker/rooms/join` (US09.1.2). The code is uppercased
 * client-side before sending — the backend does not normalize case, and the existing
 * `InviteCodeGenerator` alphabet is uppercase-only. `displayName`/`role` (E09) name the
 * participant in the room's live roster; both are optional (the backend substitutes a default
 * name and `JOUEUR`).
 */
export interface JoinRoomRequest {
  readonly code: string;
  readonly displayName?: string;
  readonly role?: ParticipantRole;
}

/**
 * API response shape for `POST /api/agilite/poker/rooms/join` (US09.1.2).
 *
 * Note `roomId` is correctly typed as a `string` (UUID) here, unlike the pre-existing
 * `RoomResponse.id: number` from US09.1.1 — that mismatch is a known bug in the earlier
 * contract, intentionally not propagated into this one.
 */
export interface JoinRoomResponse {
  readonly roomId: string;
  readonly name: string;
  readonly sequence: string;
  readonly cardValues: readonly string[];
  /** Whether the facilitator also casts a vote in this room (E09). */
  readonly facilitatorVotes: boolean;
  readonly active: boolean;
  readonly expiresAt: string;
  /** STOMP destination to subscribe to on `/ws/agilite` once joined (ADR-026 §2). */
  readonly wsTopic: string;
  /** Opaque, room-scoped token presented on the STOMP `access-token` native header. */
  readonly accessToken: string;
}

/**
 * Request body for `POST /api/agilite/poker/rooms/join-anonymous` (US09.3.1) — joining with no
 * account and no `Authorization` header at all. `pseudonym` is optional: the backend generates
 * a default (e.g. `Invité-XXXX`) when omitted or blank.
 */
export interface AnonymousJoinRequest {
  readonly code: string;
  readonly pseudonym?: string;
  readonly role?: ParticipantRole;
}

/**
 * API response shape for `POST /api/agilite/poker/rooms/join-anonymous` (US09.3.1). Mirrors
 * {@link JoinRoomResponse} with the two fields specific to anonymous participation: `sessionId`
 * (a temporary, server-generated correlation id — never persisted anywhere) and `pseudonym` (the
 * resolved display name). `guestSessionExpiresAt` is the 2h-inactivity-capped expiry of the
 * underlying access grant — distinct from `expiresAt` (the room's own lifetime).
 */
export interface AnonymousJoinResponse {
  readonly roomId: string;
  readonly name: string;
  readonly sequence: string;
  readonly cardValues: readonly string[];
  readonly active: boolean;
  readonly expiresAt: string;
  readonly wsTopic: string;
  readonly accessToken: string;
  readonly sessionId: string;
  readonly pseudonym: string;
  readonly guestSessionExpiresAt: string;
}

/**
 * Request body for `POST /api/agilite/poker/rooms/{roomId}/guest-sessions/heartbeat` (US09.3.1)
 * — keeps an anonymous guest's 2h-inactivity session alive past its current TTL.
 */
export interface GuestHeartbeatRequest {
  readonly accessToken: string;
}

/**
 * Response body for `POST /api/agilite/poker/rooms/{roomId}/guest-sessions/heartbeat`
 * (US09.3.1).
 */
export interface GuestHeartbeatResponse {
  readonly expiresAt: string;
}
