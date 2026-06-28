/**
 * ModuleRegistryService — manages the list of PIVOT modules for the current tenant.
 *
 * Responsibilities:
 * - Fetches the list of enabled modules from GET /api/modules.
 * - Stores raw DTOs in a signal (_modules).
 * - Exposes computed signals: enrichedModules, activeModules, comingSoonModules.
 * - comingSoonModules are modules present in MODULE_METADATA but not yet returned by the API.
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { PivotModuleDto, PivotModuleUi, ModuleStatus } from './module.model';
import { MODULE_METADATA, defaultMeta } from './module-metadata';

@Injectable({ providedIn: 'root' })
export class ModuleRegistryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** Raw DTOs from the API — updated by loadModules(). */
  private readonly _modules = signal<PivotModuleDto[]>([]);

  /** Read-only view of raw DTOs. */
  readonly modules = this._modules.asReadonly();

  /**
   * Enriches raw DTOs with static UI metadata (icon, route, description…).
   * Falls back to defaultMeta() for unknown module ids.
   */
  readonly enrichedModules = computed<PivotModuleUi[]>(() =>
    this._modules().map(dto => ({
      ...dto,
      ...(MODULE_METADATA[dto.id] ?? defaultMeta(dto.id)),
    }))
  );

  /**
   * Modules enabled by the tenant AND available now (not comingSoon).
   * Used to build the navigation and feature guards.
   */
  readonly activeModules = computed<PivotModuleUi[]>(() =>
    this.enrichedModules().filter(m => m.enabled && !m.comingSoon)
  );

  /**
   * Static modules from MODULE_METADATA that the API has not yet returned.
   * Displayed as "Coming soon" cards in the catalogue.
   */
  readonly comingSoonModules = computed<PivotModuleUi[]>(() =>
    Object.entries(MODULE_METADATA)
      .filter(([id]) => !this._modules().some(m => m.id === id))
      .map(([id, meta]) => ({
        id,
        name: id,
        version: '0.0.0',
        enabled: false,
        status: 'offline' as ModuleStatus,
        ...meta,
        comingSoon: true,
      }))
  );

  /**
   * Fetches the module list from the backend and updates the internal signal.
   * Call once on app init or on tenant switch.
   *
   * On HTTP error the signal is reset to [] and the observable completes without
   * error — callers do not need to handle the error case.
   */
  loadModules(): Observable<PivotModuleDto[]> {
    return this.http
      .get<PivotModuleDto[]>(`${this.apiUrl}/modules`)
      .pipe(
        tap(modules => this._modules.set(modules)),
        catchError(() => {
          this._modules.set([]);
          return of([]);
        }),
      );
  }
}
