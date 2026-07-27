import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import {
  BingoGridResponse,
  BingoRoomResponse,
  CreateBingoRoomRequest,
  JoinBingoRoomRequest,
} from '../models/bingo.model';

/**
 * Native header carrying the room-scoped access token for `GET .../grid` — deliberately not a
 * query parameter (a token belongs in a header, never a URL, this platform's standing rule — see
 * `BingoRoomController#getGrid`'s Javadoc). Same header name STOMP frames use
 * (`BingoChannelInterceptor.ACCESS_TOKEN_HEADER`).
 */
const ACCESS_TOKEN_HEADER = 'access-token';

/**
 * HTTP client for the Bingo des réunions resource (US47.1.1). `joinRoom` deliberately never
 * forces authentication — the backend resolves authenticated vs. anonymous from the ambient
 * `Authorization` header (attached by the shell's own interceptor when a session exists, absent
 * otherwise), exactly like `SessionApiService#joinSession`.
 */
@Injectable({ providedIn: 'root' })
export class BingoApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(COLLABORATIF_API_URL);

  /** Creates a new Bingo room (AC-47.1.1-01) — requires authentication. */
  createRoom(request: CreateBingoRoomRequest): Observable<BingoRoomResponse> {
    return this.http.post<BingoRoomResponse>(`${this.apiUrl}/bingo/rooms`, request);
  }

  /** Joins a room by invite code — authenticated or anonymous (AC-47.1.1-02/03). */
  joinRoom(request: JoinBingoRoomRequest): Observable<BingoRoomResponse> {
    return this.http.post<BingoRoomResponse>(`${this.apiUrl}/bingo/rooms/join`, request);
  }

  /** Re-fetches the caller's own grid for reconnection (AC-47.1.1-05). */
  getGrid(roomId: string, accessToken: string): Observable<BingoGridResponse> {
    return this.http.get<BingoGridResponse>(`${this.apiUrl}/bingo/rooms/${roomId}/grid`, {
      headers: new HttpHeaders({ [ACCESS_TOKEN_HEADER]: accessToken }),
    });
  }
}
