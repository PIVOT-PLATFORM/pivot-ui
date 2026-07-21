import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CapacityApiService } from '../services/capacity-api.service';
import {
  CadenceRequest,
  CadenceSprintResponse,
  CapacityEventRequest,
  CapacityEventResponse,
  CapacityEventStatus,
  CapacityEventType,
  CapacityMaturityLevel,
} from '../models/capacity.model';

/** RFC 7807 error body returned by every `pivot-agilite-core` error response. */
interface CapacityProblemDetail {
  readonly code?: string;
}

/**
 * Maps a `ProblemDetail.code` from the event create/update endpoints to an i18n key under
 * `capacity.form.errors`. Includes both the exact codes documented in `capacity.form.errors.*`
 * and a few plausible aliases (e.g. `INVALID_DATE_RANGE`, `FOCUS_OUT_OF_RANGE`) mapped to the
 * closest existing key, so the form degrades gracefully instead of showing a raw/untranslated
 * code if the backend's exact vocabulary differs slightly. Any code not listed here falls back
 * to the generic `capacity.form.saveError` banner.
 */
const CODE_ERROR_KEYS: Record<string, string> = {
  INVALID_TYPE: 'capacity.form.errors.INVALID_TYPE',
  INVALID_NAME: 'capacity.form.errors.INVALID_NAME',
  INVALID_START_DATE: 'capacity.form.errors.INVALID_START_DATE',
  INVALID_END_DATE: 'capacity.form.errors.INVALID_END_DATE',
  INVALID_DATE_RANGE: 'capacity.form.errors.INVALID_END_DATE',
  INVALID_FOCUS_FACTOR: 'capacity.form.errors.INVALID_FOCUS_FACTOR',
  FOCUS_OUT_OF_RANGE: 'capacity.form.errors.INVALID_FOCUS_FACTOR',
  INVALID_MARGE_SECURITE: 'capacity.form.errors.INVALID_MARGE_SECURITE',
  MARGE_OUT_OF_RANGE: 'capacity.form.errors.INVALID_MARGE_SECURITE',
  INVALID_HIERARCHY: 'capacity.form.errors.INVALID_HIERARCHY',
  INVALID_PARENT: 'capacity.form.errors.INVALID_HIERARCHY',
  HIERARCHY_TOO_DEEP: 'capacity.form.errors.INVALID_HIERARCHY',
  INVALID_PARENT_TYPE: 'capacity.form.errors.INVALID_HIERARCHY',
};

const GENERIC_ERROR_KEY = 'capacity.form.saveError';

/** Same code map, scoped to the cadence sub-form's own endpoint (`POST /events/{piId}/cadence`). */
const CADENCE_CODE_ERROR_KEYS: Record<string, string> = {
  INVALID_CADENCE: 'capacity.form.errors.INVALID_CADENCE',
  CADENCE_OVERFLOW: 'capacity.form.errors.CADENCE_OVERFLOW',
};

const CADENCE_GENERIC_ERROR_KEY = 'capacity.form.cadence.error';

/** A positive integer when non-empty; empty/null/undefined is valid (field is optional). */
function positiveNumberIfPresent(control: { value: unknown }): ValidationErrors | null {
  const raw = control.value;
  const value = typeof raw === 'string' ? raw.trim() : raw;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? null : { positiveNumber: true };
}

/** A number between 0 and 1 (inclusive) when non-empty; empty/null/undefined is valid. */
function unitRangeIfPresent(control: { value: unknown }): ValidationErrors | null {
  const raw = control.value;
  const value = typeof raw === 'string' ? raw.trim() : raw;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 && num <= 1 ? null : { unitRange: true };
}

/** Days of the week, in the order `capacity.form.weekdays.*` is keyed (0 = Sunday, per backend). */
const WEEKDAY_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;

const EVENT_TYPES: CapacityEventType[] = ['PI_PLANNING', 'SPRINT', 'RELEASE', 'CUSTOM'];
const MATURITY_LEVELS: CapacityMaturityLevel[] = ['FORMING', 'NORMING', 'PERFORMING'];
const EVENT_STATUSES: CapacityEventStatus[] = ['PLANNING', 'ACTIVE', 'DONE'];

/**
 * Creates a new capacity event, or edits an existing one — same component for both modes,
 * selected by route (`/capacity/new?teamId=` vs `/capacity/:eventId/edit`), mirroring
 * `WheelFormComponent`.
 *
 * The optional parent picker lists the target team's other events (self excluded in edit mode) —
 * the backend is the sole source of truth on which parent/child combinations are actually
 * allowed (`INVALID_HIERARCHY` and aliases), so no type-based filtering is applied client-side.
 *
 * The cadence sub-form (F11.5 — SAFe PI cadence generation) is only usable once the event
 * exists and is a PI (edit mode, `type === 'PI_PLANNING'`): `generateCadence` needs a real
 * `piId`, which a not-yet-saved draft doesn't have.
 */
@Component({
  selector: 'app-capacity-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TranslocoPipe],
  templateUrl: './capacity-form.component.html',
  styleUrl: './capacity-form.component.scss',
})
export class CapacityFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly capacityApi = inject(CapacityApiService);
  private readonly fb = inject(FormBuilder);

  readonly eventTypes = EVENT_TYPES;
  readonly maturityLevels = MATURITY_LEVELS;
  readonly eventStatuses = EVENT_STATUSES;
  readonly weekdayValues = WEEKDAY_VALUES;

  /** `true` when editing an existing event, `false` when creating a new one. */
  readonly isEdit: boolean;

  private readonly eventId: string | null;
  private readonly queryTeamId: number | null;

  readonly loadError = signal(false);
  readonly saving = signal(false);
  readonly saveNetworkError = signal(false);
  readonly errorKey = signal<string | null>(null);

  readonly workingDays = signal<number[]>([]);
  readonly parentCandidates = signal<CapacityEventResponse[]>([]);

  readonly form = this.fb.nonNullable.group({
    teamId: this.fb.control<number | null>(null),
    type: this.fb.nonNullable.control<CapacityEventType | ''>('', [Validators.required]),
    name: ['', [Validators.required, Validators.maxLength(200)]],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]],
    parentId: this.fb.control<string | null>(null),
    maturityLevel: this.fb.control<CapacityMaturityLevel | ''>(''),
    focusFactor: this.fb.control<number | null>(null, [unitRangeIfPresent]),
    margeSecurite: this.fb.control<number | null>(null, [unitRangeIfPresent]),
    pointsPerDay: this.fb.control<number | null>(null, [positiveNumberIfPresent]),
    committedPoints: this.fb.control<number | null>(null, [positiveNumberIfPresent]),
    notes: this.fb.nonNullable.control(''),
    status: this.fb.control<CapacityEventStatus | ''>(''),
  });

  // --- Cadence sub-form (F11.5) --------------------------------------------------------------

  readonly cadenceForm = this.fb.nonNullable.group({
    sprintLengthMode: this.fb.nonNullable.control<'days' | 'weeks'>('weeks'),
    sprintLengthValue: this.fb.nonNullable.control<number | null>(2, [
      Validators.required,
      positiveNumberIfPresent,
    ]),
    sprintCount: this.fb.nonNullable.control<number | null>(4, [Validators.required, positiveNumberIfPresent]),
    includeIpSprint: this.fb.nonNullable.control(false),
    namePrefix: this.fb.nonNullable.control('', [Validators.maxLength(100)]),
  });

  readonly cadenceGenerating = signal(false);
  readonly cadenceErrorKey = signal<string | null>(null);
  readonly cadenceResult = signal<CadenceSprintResponse[] | null>(null);

  constructor() {
    this.eventId = this.route.snapshot.paramMap.get('eventId');
    this.isEdit = this.eventId !== null;
    const teamIdParam = this.route.snapshot.queryParamMap.get('teamId');
    this.queryTeamId = teamIdParam !== null ? Number(teamIdParam) : null;
  }

  ngOnInit(): void {
    if (this.isEdit && this.eventId !== null) {
      this.capacityApi.getEvent(this.eventId).subscribe({
        next: event => this.prefill(event),
        error: () => this.loadError.set(true),
      });
      return;
    }

    if (this.queryTeamId === null) {
      this.loadError.set(true);
      return;
    }
    this.form.patchValue({ teamId: this.queryTeamId });
    this.loadParentCandidates(this.queryTeamId);
  }

  /** `true` once startDate/endDate are both filled and endDate precedes startDate (client mirror of `INVALID_DATE_RANGE`/`INVALID_END_DATE`). */
  isDateRangeInvalid(): boolean {
    const { startDate, endDate } = this.form.getRawValue();
    return !!startDate && !!endDate && endDate < startDate;
  }

  /** Toggles a weekday (0-6) in {@link workingDays}, keeping the list sorted ascending. */
  toggleWorkingDay(day: number, checked: boolean): void {
    this.workingDays.update(days => {
      if (checked) {
        return days.includes(day) ? days : [...days, day].sort((a, b) => a - b);
      }
      return days.filter(d => d !== day);
    });
  }

  /** Submits the event (create or update, depending on route). */
  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    if (this.isDateRangeInvalid()) {
      this.errorKey.set(CODE_ERROR_KEYS['INVALID_DATE_RANGE']);
      return;
    }

    this.saving.set(true);
    this.errorKey.set(null);
    this.saveNetworkError.set(false);

    const request: CapacityEventRequest = {
      teamId: raw.teamId ?? undefined,
      type: raw.type as CapacityEventType,
      name: raw.name.trim(),
      startDate: raw.startDate,
      endDate: raw.endDate,
      parentId: raw.parentId || null,
      maturityLevel: raw.maturityLevel || null,
      focusFactor: raw.focusFactor,
      margeSecurite: raw.margeSecurite,
      pointsPerDay: raw.pointsPerDay,
      committedPoints: raw.committedPoints,
      workingDays: this.workingDays().length > 0 ? this.workingDays() : null,
      notes: raw.notes.trim() || null,
      status: this.isEdit ? raw.status || null : null,
    };

    const onSuccess = (event: CapacityEventResponse): void => {
      this.saving.set(false);
      this.router.navigate(['/capacity', event.id]);
    };
    const onError = (error: unknown): void => {
      this.saving.set(false);
      const code = this.extractErrorCode(error);
      this.errorKey.set(code ? (CODE_ERROR_KEYS[code] ?? GENERIC_ERROR_KEY) : null);
      if (!code) {
        this.saveNetworkError.set(true);
      }
    };

    if (this.isEdit && this.eventId !== null) {
      this.capacityApi.updateEvent(this.eventId, request).subscribe({ next: onSuccess, error: onError });
    } else {
      this.capacityApi.createEvent(request).subscribe({ next: onSuccess, error: onError });
    }
  }

  /** Generates the PI's child sprints from the cadence sub-form (F11.5). */
  generateCadence(): void {
    if (this.cadenceForm.invalid || this.cadenceGenerating() || this.eventId === null) {
      this.cadenceForm.markAllAsTouched();
      return;
    }

    const raw = this.cadenceForm.getRawValue();
    const request: CadenceRequest = {
      sprintLengthDays: raw.sprintLengthMode === 'days' ? raw.sprintLengthValue : null,
      sprintLengthWeeks: raw.sprintLengthMode === 'weeks' ? raw.sprintLengthValue : null,
      sprintCount: raw.sprintCount ?? 0,
      includeIpSprint: raw.includeIpSprint,
      namePrefix: raw.namePrefix.trim() || null,
    };

    this.cadenceGenerating.set(true);
    this.cadenceErrorKey.set(null);
    this.cadenceResult.set(null);

    this.capacityApi.generateCadence(this.eventId, request).subscribe({
      next: sprints => {
        this.cadenceGenerating.set(false);
        this.cadenceResult.set(sprints);
      },
      error: (error: unknown) => {
        this.cadenceGenerating.set(false);
        const code = this.extractErrorCode(error);
        this.cadenceErrorKey.set(code ? (CADENCE_CODE_ERROR_KEYS[code] ?? CADENCE_GENERIC_ERROR_KEY) : CADENCE_GENERIC_ERROR_KEY);
      },
    });
  }

  private prefill(event: CapacityEventResponse): void {
    this.form.patchValue({
      teamId: event.teamId,
      type: event.type,
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      parentId: event.parentId,
      maturityLevel: event.maturityLevel ?? '',
      focusFactor: event.focusFactor,
      margeSecurite: event.margeSecurite,
      pointsPerDay: event.pointsPerDay,
      committedPoints: event.committedPoints,
      notes: event.notes ?? '',
      status: event.status,
    });
    this.workingDays.set([...event.workingDays]);
    this.loadParentCandidates(event.teamId);
  }

  private loadParentCandidates(teamId: number): void {
    this.capacityApi.listEvents(teamId).subscribe({
      next: events => this.parentCandidates.set(events.filter(e => e.id !== this.eventId)),
      // Non-fatal: the parent picker just stays empty (still "None") if this listing fails.
      error: () => this.parentCandidates.set([]),
    });
  }

  private extractErrorCode(error: unknown): string | undefined {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as CapacityProblemDetail | undefined;
      return body?.code;
    }
    return undefined;
  }
}
