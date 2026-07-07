import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PIVOT_API_URL } from '../config/tokens';
import type { ModuleStatusDto } from './module.model';

@Injectable({ providedIn: 'root' })
export class ModuleStatusService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(PIVOT_API_URL);

  /**
   * Fetches the activation status of one module for the current tenant.
   * GET /api/modules/{id}/status — no-cache to bypass intermediate caches.
   */
  getStatus(moduleId: string): Observable<ModuleStatusDto> {
    return this.http.get<ModuleStatusDto>(`${this.apiUrl}/modules/${moduleId}/status`, {
      headers: new HttpHeaders({ 'Cache-Control': 'no-cache' }),
    });
  }
}
