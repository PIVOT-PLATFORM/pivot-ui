/**
 * ModuleRegistryService — manages the list of PIVOT modules for the current tenant.
 *
 * Responsibilities:
 * - Fetches the list of enabled modules from GET /api/modules.
 * - Stores raw DTOs in a signal (_modules).
 * - Exposes computed signals: enrichedModules, activeModules, comingSoonModules.
 *
 * `comingSoon` is a purely static, UI-side readiness flag (MODULE_METADATA) — independent of
 * whether the backend module registry knows about a module. A module can be registered and
 * enabled server-side (pivot-core's module registry, activated for the tenant) while its
 * shell-side integration (lazy-loaded route, real component) isn't wired in yet: it must still
 * show as "coming soon", not vanish from the catalogue. See pivot-core's ModuleCatalogProperties
 * for the mirrored bug this fixes on the backend side (module registry previously always empty).
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
   * Full module catalogue: every module returned by the API (enriched with static UI
   * metadata), plus every module known only statically (MODULE_METADATA) that the API has not
   * (yet) returned — both merged into one list, classified only by their final `enabled`/
   * `comingSoon` flags. Unknown API-returned ids fall back to defaultMeta().
   */
  readonly enrichedModules = computed<PivotModuleUi[]>(() => {
    const apiModules = this._modules();
    const apiIds = new Set(apiModules.map(m => m.id));

    const fromApi = apiModules.map(dto => ({
      ...dto,
      ...(MODULE_METADATA[dto.id] ?? defaultMeta(dto.id)),
    }));

    const staticOnly = Object.entries(MODULE_METADATA)
      .filter(([id]) => !apiIds.has(id))
      .map(([id, meta]) => ({
        id,
        name: id,
        version: '0.0.0',
        enabled: false,
        status: 'offline' as ModuleStatus,
        ...meta,
      }));

    return [...fromApi, ...staticOnly];
  });

  /**
   * Modules enabled by the tenant AND ready in the shell (not comingSoon).
   * Used to build the navigation and feature guards.
   */
  readonly activeModules = computed<PivotModuleUi[]>(() =>
    this.enrichedModules().filter(m => m.enabled && !m.comingSoon)
  );

  /**
   * Every module whose shell-side UI isn't ready yet (`comingSoon: true`), regardless of
   * whether the backend already knows about it. Displayed as "Coming soon" cards.
   */
  readonly comingSoonModules = computed<PivotModuleUi[]>(() =>
    this.enrichedModules().filter(m => m.comingSoon)
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
