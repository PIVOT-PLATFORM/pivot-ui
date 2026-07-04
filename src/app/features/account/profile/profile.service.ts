/**
 * ProfileService — HTTP client for the account profile endpoints (US02.1.1).
 *
 * See `profile.model.ts` for the full backend contract this mirrors
 * (`pivot-core` PR #129). No client-side state is cached here — `ProfileComponent`
 * owns the loaded/edited state as signals; this service is a thin HTTP boundary
 * so it stays trivially testable and reusable.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { ProfileDto, UpdateProfileRequest } from './profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** GET /api/account/profile — 403 if unauthenticated (surfaced to the caller as an error). */
  getProfile(): Observable<ProfileDto> {
    return this.http.get<ProfileDto>(`${this.apiUrl}/account/profile`);
  }

  /**
   * PATCH /api/account/profile.
   *
   * The payload type only has `firstName`/`lastName` — never spread an arbitrary object here,
   * always build a literal `{ firstName, lastName }`. Sending an `email` key (even unchanged)
   * makes the backend reject the whole request with 400 EMAIL_CHANGE_NOT_ALLOWED.
   */
  updateProfile(payload: UpdateProfileRequest): Observable<ProfileDto> {
    return this.http.patch<ProfileDto>(`${this.apiUrl}/account/profile`, payload);
  }

  /** POST /api/account/profile/avatar — multipart, field name MUST be `file`. */
  uploadAvatar(file: File): Observable<ProfileDto> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ProfileDto>(`${this.apiUrl}/account/profile/avatar`, formData);
  }
}
