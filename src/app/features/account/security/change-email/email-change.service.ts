/**
 * EmailChangeService — HTTP client for the account email-change endpoints (US02.2.2).
 *
 * See `email-change.model.ts` for the full backend contract this mirrors
 * (`pivot-core` PR #131). No client-side state is cached here — the consuming
 * components own the loaded/edited state as signals; this service is a thin HTTP
 * boundary so it stays trivially testable and reusable (mirrors `ProfileService`).
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmailChangeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * POST /api/account/email — authentifié (token porteur, jamais de userId dans le body).
   *
   * Renvoie toujours 202 (corps vide) que `newEmail` soit déjà pris ou non — c'est le
   * mécanisme anti-énumération du backend. Le seul signal d'échec exploitable côté
   * frontend est un statut HTTP non-2xx (401 mot de passe incorrect, 429 rate limit,
   * 400 validation) — jamais un corps qui distinguerait le cas "doublon".
   */
  requestChange(newEmail: string, currentPassword: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/account/email`, { newEmail, currentPassword });
  }

  /**
   * GET /api/account/email/confirm — public, pas d'authentification (lien cliqué depuis
   * l'email, potentiellement sans session active sur cet appareil).
   */
  confirm(token: string): Observable<void> {
    return this.http.get<void>(`${this.apiUrl}/account/email/confirm`, { params: { token } });
  }
}
