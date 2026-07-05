/**
 * SessionsService — the current user's active sessions (US02.2.3).
 *
 * Consumes the contract confirmed in pivot-core PR #132:
 * - GET    /api/account/sessions            → SessionDto[] (sorted `createdAt`
 *   desc by the backend), 403 if unauthenticated (no dedicated 401 in this
 *   project — same as every other authenticated endpoint)
 * - DELETE /api/account/sessions/{id}       → 204 revoked · 404 not owned /
 *   already revoked (indistinguishable by design) · 403 if `id` is the
 *   current session (the UI never offers this action for the current
 *   session, but the API enforces it independently)
 * - DELETE /api/account/sessions            → 204, revokes every session
 *   except the current one (silent no-op if there were none)
 *
 * No `userId`/`tenantId` is ever sent by the client — identity is resolved
 * server-side from the bearer token on every call.
 *
 * State is optimistic: `revoke()` removes the session from the local signal
 * immediately, `revokeAllOthers()` clears every non-current session
 * immediately — both roll back to the previous list on error so the session
 * reappears and the caller can show an error toast per the AC.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, tap, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import type { SessionDto } from './session.model';

@Injectable({ providedIn: 'root' })
export class SessionsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly _sessions = signal<SessionDto[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadError = signal(false);
  private readonly _revokingIds = signal<Record<number, boolean>>({});
  private readonly _revokingAll = signal(false);

  /** Current session list, as last returned by the backend (createdAt desc). */
  readonly sessions = this._sessions.asReadonly();
  /** True while `GET /api/account/sessions` is in flight. */
  readonly loading = this._loading.asReadonly();
  /** True if the last GET failed — drives the error state + retry button. */
  readonly loadError = this._loadError.asReadonly();
  /** True while `DELETE /api/account/sessions` (revoke-all-others) is in flight. */
  readonly revokingAll = this._revokingAll.asReadonly();

  /** True while a revoke request for this session id is pending. */
  isRevoking(id: number): boolean {
    return this._revokingIds()[id] ?? false;
  }

  /** Fetches the current user's session list. Resets loading/error state. */
  loadSessions(): Observable<SessionDto[]> {
    this._loading.set(true);
    this._loadError.set(false);

    return this.http.get<SessionDto[]>(`${this.apiUrl}/account/sessions`).pipe(
      tap(sessions => {
        this._sessions.set(sessions);
        this._loading.set(false);
      }),
      catchError(() => {
        this._loading.set(false);
        this._loadError.set(true);
        return of([]);
      })
    );
  }

  /**
   * Revokes a single (non-current) session, optimistically. On failure the
   * session is re-inserted in `createdAt`-descending order and the error is
   * re-thrown so the caller can show an error toast.
   */
  revoke(session: SessionDto): Observable<void> {
    const { id } = session;
    this.setRevoking(id, true);
    this.removeFromList(id);

    return this.http.delete<void>(`${this.apiUrl}/account/sessions/${id}`).pipe(
      tap(() => this.setRevoking(id, false)),
      catchError((err: HttpErrorResponse) => {
        this.setRevoking(id, false);
        this.restoreSession(session);
        return throwError(() => err);
      })
    );
  }

  /**
   * Revokes every session except the current one, optimistically. Restores
   * the full previous list on failure. No-op (no request sent) if there is
   * nothing to revoke.
   */
  revokeAllOthers(): Observable<void> {
    const previous = this._sessions();
    if (!previous.some(s => !s.isCurrent)) {
      return of(undefined);
    }

    this._revokingAll.set(true);
    this._sessions.set(previous.filter(s => s.isCurrent));

    return this.http.delete<void>(`${this.apiUrl}/account/sessions`).pipe(
      tap(() => this._revokingAll.set(false)),
      catchError((err: HttpErrorResponse) => {
        this._revokingAll.set(false);
        this._sessions.set(previous);
        return throwError(() => err);
      })
    );
  }

  private removeFromList(id: number): void {
    this._sessions.update(list => list.filter(s => s.id !== id));
  }

  private restoreSession(session: SessionDto): void {
    this._sessions.update(list => {
      if (list.some(s => s.id === session.id)) {
        return list;
      }
      return [...list, session].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }

  private setRevoking(id: number, value: boolean): void {
    this._revokingIds.update(map => {
      if (!value) {
        if (!(id in map)) {
          return map;
        }
        const next = { ...map };
        delete next[id];
        return next;
      }
      return { ...map, [id]: value };
    });
  }
}
