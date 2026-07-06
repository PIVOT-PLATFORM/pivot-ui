/**
 * PlansService — super admin, platform-wide plan + per-plan module list
 * management (US03.3.1).
 *
 * Consumes all 5 `/superadmin/plans` endpoints (`ROLE_SUPER_ADMIN` only, see
 * `plan.model.ts` for the full contract): list, create, get-one, full-replace
 * modules and single-add module. `GET .../modules` is intentionally not
 * wrapped separately — `loadOne()`'s `PlanDto.moduleIds` already carries the
 * same information, and the detail page never needs the module list without
 * the rest of the plan.
 *
 * No `tenantId` concept applies here at all: like `/superadmin/tenants`, this
 * is a cross-tenant, platform-level configuration screen backed entirely by
 * the bearer token's `ROLE_SUPER_ADMIN` claim.
 */
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { CreatePlanRequest, PlanDto, PlanModulesResult } from './plan.model';

@Injectable({ providedIn: 'root' })
export class PlansService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly _plans = signal<PlanDto[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadError = signal(false);

  private readonly _currentPlan = signal<PlanDto | null>(null);
  private readonly _detailLoading = signal(false);
  private readonly _detailError = signal(false);
  private readonly _detailNotFound = signal(false);

  /** All plans (unpaginated). */
  readonly plans = this._plans.asReadonly();
  /** True while `GET /superadmin/plans` is in flight. */
  readonly loading = this._loading.asReadonly();
  /** True if the last list GET failed — drives the error state + retry button. */
  readonly loadError = this._loadError.asReadonly();

  /** The plan currently shown by the detail page, or null before/after a failed load. */
  readonly currentPlan = this._currentPlan.asReadonly();
  /** True while `GET /superadmin/plans/{planId}` is in flight. */
  readonly detailLoading = this._detailLoading.asReadonly();
  /** True if the last detail GET failed with a non-404 error. */
  readonly detailError = this._detailError.asReadonly();
  /** True if the last detail GET failed with a 404 (unknown planId). */
  readonly detailNotFound = this._detailNotFound.asReadonly();

  /** Fetches every plan. Resets loading/error state. */
  loadAll(): Observable<PlanDto[]> {
    this._loading.set(true);
    this._loadError.set(false);

    return this.http.get<PlanDto[]>(`${this.apiUrl}/superadmin/plans`).pipe(
      tap(plans => {
        this._plans.set(plans);
        this._loading.set(false);
      }),
      catchError(() => {
        this._loading.set(false);
        this._loadError.set(true);
        this._plans.set([]);
        return of([] as PlanDto[]);
      })
    );
  }

  /**
   * Creates a plan and appends it to the current {@link plans} list on
   * success. Rejects with the raw `HttpErrorResponse` on failure — callers
   * map `409 PLAN_NAME_ALREADY_EXISTS`/`400` to inline field feedback.
   */
  create(request: CreatePlanRequest): Observable<PlanDto> {
    return this.http.post<PlanDto>(`${this.apiUrl}/superadmin/plans`, request).pipe(
      tap(plan => this._plans.update(list => [...list, plan]))
    );
  }

  /** Fetches one plan by id. Resets detail loading/error/notFound state. */
  loadOne(planId: number): Observable<PlanDto> {
    this._detailLoading.set(true);
    this._detailError.set(false);
    this._detailNotFound.set(false);
    this._currentPlan.set(null);

    return this.http.get<PlanDto>(`${this.apiUrl}/superadmin/plans/${planId}`).pipe(
      tap(plan => {
        this._currentPlan.set(plan);
        this._detailLoading.set(false);
      }),
      catchError((err: HttpErrorResponse) => {
        this._detailLoading.set(false);
        if (err.status === 404) {
          this._detailNotFound.set(true);
        } else {
          this._detailError.set(true);
        }
        this._currentPlan.set(null);
        return EMPTY;
      })
    );
  }

  /**
   * Full replacement of a plan's module list.
   *
   * This is the only way to remove a module from a plan: the backend
   * contract (`plan.model.ts`) has no dedicated per-module DELETE endpoint,
   * only this full-replace PUT and the single-add POST below. Removal is
   * implemented by callers as "current moduleIds minus the removed one",
   * including the case where that leaves an empty array — an explicit empty
   * array is a valid "clear all modules" request per the backend contract,
   * not an error.
   *
   * Patches {@link currentPlan}'s `moduleIds` in place on success so the
   * detail view reflects the new state without a full reload.
   */
  replaceModules(planId: number, moduleIds: string[]): Observable<PlanModulesResult> {
    return this.http
      .put<PlanModulesResult>(`${this.apiUrl}/superadmin/plans/${planId}/modules`, { moduleIds })
      .pipe(tap(result => this.patchCurrentPlanModules(planId, result.moduleIds)));
  }

  /**
   * Adds a single module to a plan (idempotent — re-adding an already-listed
   * module id succeeds as a no-op rather than erroring).
   *
   * Patches {@link currentPlan}'s `moduleIds` in place on success, same as
   * {@link replaceModules}.
   */
  addModule(planId: number, moduleId: string): Observable<PlanModulesResult> {
    return this.http
      .post<PlanModulesResult>(
        `${this.apiUrl}/superadmin/plans/${planId}/modules/${encodeURIComponent(moduleId)}`,
        null
      )
      .pipe(tap(result => this.patchCurrentPlanModules(planId, result.moduleIds)));
  }

  private patchCurrentPlanModules(planId: number, moduleIds: string[]): void {
    const current = this._currentPlan();
    if (current && current.id === planId) {
      this._currentPlan.set({ ...current, moduleIds });
    }
  }
}
