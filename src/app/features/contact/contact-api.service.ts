import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

interface ContactPayload {
  email: string;
  message: string;
  lang: string;
}

/**
 * Sends contact form submissions to the PIVOT backend.
 * Returns 202 Accepted on success.
 */
@Injectable({ providedIn: 'root' })
export class ContactApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/contact`;

  submit(payload: ContactPayload): Observable<void> {
    return this.http.post<void>(this.url, payload);
  }
}
