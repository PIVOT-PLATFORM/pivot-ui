/**
 * Domain models for the Bingo des réunions mini-game (US47.1.1, E47/F47.1). Mirrors the real
 * backend DTOs (`fr.pivot.collaboratif.bingo.dto`, `pivot-core`).
 */

/** A single grid cell (`CellDto.java`) — never carries anything but its own state. */
export interface BingoCell {
  readonly cellIndex: number;
  readonly phrase: string;
  readonly marked: boolean;
}

/** A participant's own 5x5 grid (`GridDto.java`) — `null` for a spectator. */
export interface BingoGrid {
  readonly cells: BingoCell[];
}

/** `PLAYER` or `SPECTATOR` (AC-47.1.1-13). */
export type BingoParticipantRole = 'PLAYER' | 'SPECTATOR';

/** Room lifecycle status (`BingoRoomStatus.java`). */
export type BingoRoomStatus = 'OPEN' | 'FINISHED';

/** Request body for `POST /api/collaboratif/bingo/rooms` (AC-47.1.1-01). */
export interface CreateBingoRoomRequest {
  readonly name: string;
}

/** Request body for `POST /api/collaboratif/bingo/rooms/join` (AC-47.1.1-02/03). */
export interface JoinBingoRoomRequest {
  readonly code: string;
  readonly displayName?: string;
}

/**
 * Response shape shared by create and both join flows (`BingoRoomResponse.java`) — `code` is
 * present on create, absent (`null`) on join.
 */
export interface BingoRoomResponse {
  readonly roomId: string;
  readonly code: string | null;
  readonly name: string;
  readonly status: BingoRoomStatus;
  readonly maxPlayers: number;
  readonly expiresAt: string;
  readonly wsTopic: string;
  readonly accessToken: string;
  readonly role: BingoParticipantRole;
  readonly grid: BingoGrid | null;
}

/** Response of `GET /api/collaboratif/bingo/rooms/{roomId}/grid` (AC-47.1.1-05). */
export interface BingoGridResponse {
  readonly roomId: string;
  readonly status: BingoRoomStatus;
  readonly role: BingoParticipantRole;
  readonly grid: BingoGrid | null;
}

/** Backend problem-detail error body, as used across PIVOT's REST error contract. */
export interface BingoProblemDetailResponse {
  readonly code?: string;
  readonly detail?: string;
}

// ---------------------------------------------------------------------------------------------
// STOMP broadcast event payloads (`/topic/collaboratif/bingo/{roomId}`) — every one carries a
// `roomId`; none of them ever carries a `cellIndex`/`phrase`/grid disposition (SEC-04).
// ---------------------------------------------------------------------------------------------

export interface BingoParticipantJoinedEvent {
  readonly type: 'PARTICIPANT_JOINED';
  readonly roomId: string;
  readonly participantId: string;
  readonly displayName: string;
  readonly playerCount: number;
  readonly spectatorCount: number;
}

/** Never carries `cellIndex` or the phrase — aggregate-only (AC-47.1.1-08). */
export interface BingoCellMarkedEvent {
  readonly type: 'CELL_MARKED';
  readonly roomId: string;
  readonly participantId: string;
  readonly markedCount: number;
}

export interface BingoWinningLine {
  readonly kind: 'ROW' | 'COLUMN' | 'DIAGONAL';
  readonly index: number;
}

export interface BingoWonEvent {
  readonly type: 'BINGO';
  readonly roomId: string;
  readonly participantId: string;
  readonly displayName: string;
  readonly line: BingoWinningLine;
}

/** Union of every event shape that can arrive on a room's STOMP topic. */
export type BingoTopicEvent = BingoParticipantJoinedEvent | BingoCellMarkedEvent | BingoWonEvent;

/** STOMP `/user/queue/errors` payload for a rejected `mark` (AC-47.1.1-14/18/19). */
export interface BingoWsErrorPayload {
  readonly error: string;
  readonly code: 'SPECTATOR_CANNOT_MARK' | 'INVALID_CELL' | 'ROOM_FINISHED' | null;
}

/** Extracts the room id from a `wsTopic` (`/topic/collaboratif/bingo/{id}`). */
export function bingoRoomIdFromTopic(wsTopic: string): string {
  return wsTopic.split('/').pop() ?? '';
}
