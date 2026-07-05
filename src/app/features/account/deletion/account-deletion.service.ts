/**
 * AccountDeletionService — HTTP client for the US02.2.4 account deletion flow.
 *
 * Consumes pivot-core PR #140 (contract final, not yet merged at time of writing):
 * - GET    /account/deletion/confirmation-method → `{ method: 'PASSWORD' | 'OTP' }`
 * - POST   /account/deletion/otp                 → 202, sends a 6-digit code (10 min TTL)
 * - DELETE /account                              → `{ effectiveDeletionDate }` · 401/403/409
 * - POST   /account/deletion/cancel              → **public**, no auth — `{ token }` body
 *
 * No optimistic local state here (unlike AdminModuleService): every call in this
 * flow is either idempotent-safe to just await, or irreversible enough that the
 * UI must wait for the real server response before changing anything.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  CancelDeletionResponse,
  ConfirmationMethodResponse,
  DeleteAccountRequest,
  DeleteAccountResponse,
} from './account-deletion.model';

@Injectable({ providedIn: 'root' })
export class AccountDeletionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** Whether the current account confirms deletion with a password or an emailed OTP. */
  getConfirmationMethod(): Observable<ConfirmationMethodResponse> {
    return this.http.get<ConfirmationMethodResponse>(`${this.apiUrl}/account/deletion/confirmation-method`);
  }

  /** Triggers the 6-digit deletion-confirmation OTP email (OIDC/Google-only accounts). */
  requestOtp(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/account/deletion/otp`, {});
  }

  /**
   * Irreversible-by-design: permanently schedules the account for deletion after
   * the server-configured grace period. Exactly one of `currentPassword`/`otp`
   * must be set, matching {@link getConfirmationMethod}.
   */
  deleteAccount(request: DeleteAccountRequest): Observable<DeleteAccountResponse> {
    return this.http.delete<DeleteAccountResponse>(`${this.apiUrl}/account`, { body: request });
  }

  /**
   * Public endpoint (reachable unauthenticated from the emailed cancel link — all
   * sessions were revoked the moment deletion was requested). Deliberately a POST
   * driven by an explicit button click on a dedicated Angular page, never a bare
   * `<a href>` GET link, so an email-scanning bot cannot trigger it by prefetching.
   */
  cancelDeletion(token: string): Observable<CancelDeletionResponse> {
    return this.http.post<CancelDeletionResponse>(`${this.apiUrl}/account/deletion/cancel`, { token });
  }
}
