import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  CapacityAbsenceImportResponse,
  CapacityEventMemberResponse,
  CapacityEventResponse,
  CapacitySummaryResponse,
  CapacityVelocityAverageResponse,
  CapacityVelocityForecastResponse,
  CapacityVelocityHistoryEntry,
} from '../models/capacity.model';
import { extractErrorCode } from '../services/capacity-error.util';
import { CapacityApiService } from '../services/capacity-api.service';

const MIN_AVAILABILITY_PERCENT = 10;
const MAX_AVAILABILITY_PERCENT = 100;
const MIN_FOCUS_FACTOR_PERCENT = 10;
const MAX_FOCUS_FACTOR_PERCENT = 100;

/**
 * Detail view of a single capacity event (US11.1.1) — members and their availability/absences/
 * focus-factor override (US11.2.1/US11.2.2/US11.6.2), parent/children hierarchy with `isIpIteration`
 * children visually excluded (US11.3.1/US11.5.1), net-capacity summary (US11.1.2, superseded by
 * the full engine — US11.6.5), CSV absence import (US11.7.1), and — for `SPRINT` events —
 * committed/completed points, velocity history and forecast (US11.4.1/US11.6.3), with a link into
 * the burndown chart (US11.4.2).
 *
 * The net-capacity figure carries a "provisional estimate" badge whenever the backend reports
 * `isProvisional: true` (US11.6.5 §Architecture) — meaning no real engine parameter (holidays,
 * maturity, focus factor) has been configured yet, not a technical limitation. Once any of those
 * exist, the backend switches to the full formula and the badge becomes a neutral "full
 * calculation" one instead — never keep showing "provisional" once the engine is actually engaged.
 */
@Component({
  selector: 'app-capacity-event-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './capacity-event-detail.component.html',
  styleUrl: './capacity-event-detail.component.scss',
})
export class CapacityEventDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly capacityApi = inject(CapacityApiService);

  private readonly eventId: string;

  readonly event = signal<CapacityEventResponse | null>(null);
  readonly summary = signal<CapacitySummaryResponse | null>(null);
  readonly members = signal<CapacityEventMemberResponse[]>([]);
  readonly loadError = signal(false);

  readonly absenceStartDrafts = signal<Record<string, string>>({});
  readonly absenceEndDrafts = signal<Record<string, string>>({});
  readonly absenceError = signal<string | null>(null);

  readonly committedPointsDraft = signal('');
  readonly completedPointsDraft = signal('');
  readonly velocitySaving = signal(false);
  readonly velocityHistory = signal<CapacityVelocityHistoryEntry[]>([]);
  readonly velocityAverage = signal<CapacityVelocityAverageResponse | null>(null);
  readonly velocityForecast = signal<CapacityVelocityForecastResponse | null>(null);

  readonly isPiPlanning = computed(() => this.event()?.type === 'PI_PLANNING');
  readonly isIncrement = computed(() => this.event()?.type === 'INCREMENT');
  readonly isParentEvent = computed(() => this.isPiPlanning() || this.isIncrement());
  readonly isSprint = computed(() => this.event()?.type === 'SPRINT');
  /** `isIpIteration` only has meaning — and is only offered — on a SPRINT child of a PI_PLANNING (US11.5.1). */
  readonly showIpIterationToggle = computed(() => this.isSprint() && this.event()?.parent?.type === 'PI_PLANNING');
  readonly childrenExpanded = signal(true);

  readonly focusFactorDrafts = signal<Record<string, string>>({});

  readonly importFile = signal<File | null>(null);
  readonly importing = signal(false);
  readonly importResult = signal<CapacityAbsenceImportResponse | null>(null);
  readonly importNetworkError = signal(false);

  constructor() {
    this.eventId = this.route.snapshot.paramMap.get('eventId') ?? '';
  }

  ngOnInit(): void {
    this.load();
  }

  /** (Re)loads the event, its provisional summary, and (for non-PI types) its members. */
  load(): void {
    if (this.eventId === '') {
      this.loadError.set(true);
      return;
    }
    this.loadError.set(false);
    this.capacityApi.getEvent(this.eventId).subscribe({
      next: event => {
        this.event.set(event);
        this.committedPointsDraft.set(event.committedPoints !== null ? String(event.committedPoints) : '');
        this.completedPointsDraft.set(event.completedPoints !== null ? String(event.completedPoints) : '');
        if (event.type !== 'PI_PLANNING') {
          this.loadMembers();
        }
        if (event.type === 'SPRINT') {
          this.loadVelocityHistory(event.teamId);
        }
      },
      error: () => this.loadError.set(true),
    });
    this.capacityApi.getSummary(this.eventId).subscribe({
      next: summary => this.summary.set(summary),
      error: () => {
        // Summary failure doesn't block the rest of the detail view.
      },
    });
  }

  private loadMembers(): void {
    this.capacityApi.listMembers(this.eventId).subscribe({
      next: members => this.members.set(members),
      error: () => this.loadError.set(true),
    });
  }

  private loadVelocityHistory(teamId: number): void {
    this.capacityApi.getVelocityHistory(teamId).subscribe({ next: history => this.velocityHistory.set(history), error: () => undefined });
    this.capacityApi.getVelocityAverage(teamId).subscribe({ next: average => this.velocityAverage.set(average), error: () => undefined });
    this.capacityApi.getVelocityForecast(teamId).subscribe({ next: forecast => this.velocityForecast.set(forecast), error: () => undefined });
  }

  /** Toggles a `SPRINT` child's IP-iteration flag — excludes it from its PI's aggregated capacity (US11.5.1). */
  toggleIpIteration(event: Event): void {
    const isIpIteration = (event.target as HTMLInputElement).checked;
    this.capacityApi.updateEvent(this.eventId, { isIpIteration }).subscribe({
      next: updated => {
        this.event.set(updated);
        this.reloadSummary();
      },
      error: () => undefined,
    });
  }

  /** Updates a member's focus-factor override draft. */
  onFocusFactorInput(memberId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.focusFactorDrafts.update(map => ({ ...map, [memberId]: value }));
  }

  /** The value to display in a member's focus-factor input — the in-progress draft, or the member's current override. */
  focusFactorValue(member: CapacityEventMemberResponse): string {
    const draft = this.focusFactorDrafts()[member.id];
    if (draft !== undefined) {
      return draft;
    }
    return member.focusFactorPercent !== null ? String(member.focusFactorPercent) : '';
  }

  /** Saves a member's focus-factor override, clamped to [10, 100] (US11.6.2). */
  saveFocusFactor(member: CapacityEventMemberResponse): void {
    const raw = Number(this.focusFactorDrafts()[member.id]);
    if (!raw) {
      return;
    }
    const clamped = Math.min(MAX_FOCUS_FACTOR_PERCENT, Math.max(MIN_FOCUS_FACTOR_PERCENT, Math.round(raw)));
    this.capacityApi.updateMember(this.eventId, member.id, { focusFactorPercent: clamped }).subscribe({
      next: updated => this.replaceMember(updated),
      error: () => undefined,
    });
  }

  /** Captures the CSV file selected for absence import (US11.7.1). */
  onImportFileChange(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    this.importFile.set(files && files.length > 0 ? files[0] : null);
  }

  /** Uploads the selected CSV file and reports the per-row outcome, never all-or-nothing. */
  importAbsencesCsv(): void {
    const file = this.importFile();
    if (!file) {
      return;
    }
    this.importing.set(true);
    this.importResult.set(null);
    this.importNetworkError.set(false);
    this.capacityApi.importAbsencesCsv(this.eventId, file).subscribe({
      next: result => {
        this.importing.set(false);
        this.importResult.set(result);
        this.importFile.set(null);
        this.loadMembers();
        this.reloadSummary();
      },
      error: () => {
        this.importing.set(false);
        this.importNetworkError.set(true);
      },
    });
  }

  /** Toggles the visibility of a PI Planning event's children list (US11.3.1 A11y — expandable node). */
  toggleChildrenExpanded(): void {
    this.childrenExpanded.update(v => !v);
  }

  /** Toggles a member's exclusion from the capacity calculation. */
  toggleExcluded(member: CapacityEventMemberResponse, event: Event): void {
    const excluded = (event.target as HTMLInputElement).checked;
    this.capacityApi.updateMember(this.eventId, member.id, { excluded }).subscribe({
      next: updated => this.replaceMember(updated),
      error: () => undefined,
    });
  }

  /** Updates a member's availability percentage, clamped to [10, 100]. */
  onAvailabilityInput(member: CapacityEventMemberResponse, event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    const clamped = Math.min(MAX_AVAILABILITY_PERCENT, Math.max(MIN_AVAILABILITY_PERCENT, Math.round(raw) || MIN_AVAILABILITY_PERCENT));
    this.capacityApi.updateMember(this.eventId, member.id, { availabilityPercent: clamped }).subscribe({
      next: updated => this.replaceMember(updated),
      error: () => undefined,
    });
  }

  /** Updates the absence-start draft for a member's new-absence form. */
  onAbsenceStartInput(memberId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.absenceStartDrafts.update(map => ({ ...map, [memberId]: value }));
  }

  /** Updates the absence-end draft for a member's new-absence form. */
  onAbsenceEndInput(memberId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.absenceEndDrafts.update(map => ({ ...map, [memberId]: value }));
  }

  /** Submits a new absence for a member — date range only, no reason field (RGPD, US11.2.2). */
  addAbsence(member: CapacityEventMemberResponse): void {
    const dateDebut = this.absenceStartDrafts()[member.id];
    const dateFin = this.absenceEndDrafts()[member.id];
    if (!dateDebut || !dateFin) {
      return;
    }
    this.absenceError.set(null);
    this.capacityApi.createAbsence(this.eventId, member.id, { dateDebut, dateFin }).subscribe({
      next: () => {
        this.absenceStartDrafts.update(map => ({ ...map, [member.id]: '' }));
        this.absenceEndDrafts.update(map => ({ ...map, [member.id]: '' }));
        this.loadMembers();
        this.reloadSummary();
      },
      error: error => {
        const code = extractErrorCode(error);
        this.absenceError.set(code ?? 'GENERIC');
      },
    });
  }

  /** Deletes an absence. */
  deleteAbsence(absenceId: string): void {
    this.capacityApi.deleteAbsence(this.eventId, absenceId).subscribe({
      next: () => {
        this.loadMembers();
        this.reloadSummary();
      },
      error: () => undefined,
    });
  }

  /** Updates the committed-points draft. */
  onCommittedPointsInput(event: Event): void {
    this.committedPointsDraft.set((event.target as HTMLInputElement).value);
  }

  /** Updates the completed-points draft. */
  onCompletedPointsInput(event: Event): void {
    this.completedPointsDraft.set((event.target as HTMLInputElement).value);
  }

  /** Saves whichever of committed/completed points was actually edited. */
  saveVelocity(): void {
    const event = this.event();
    if (!event) {
      return;
    }
    this.velocitySaving.set(true);
    const committed = this.committedPointsDraft().trim();
    const completed = this.completedPointsDraft().trim();
    this.capacityApi
      .updateVelocity(this.eventId, {
        ...(committed !== '' ? { committedPoints: Number(committed) } : {}),
        ...(completed !== '' ? { completedPoints: Number(completed) } : {}),
      })
      .subscribe({
        next: updated => {
          this.velocitySaving.set(false);
          this.event.set(updated);
          this.loadVelocityHistory(updated.teamId);
        },
        error: () => this.velocitySaving.set(false),
      });
  }

  private replaceMember(updated: CapacityEventMemberResponse): void {
    this.members.update(list => list.map(m => (m.id === updated.id ? updated : m)));
    this.reloadSummary();
  }

  private reloadSummary(): void {
    this.capacityApi.getSummary(this.eventId).subscribe({ next: summary => this.summary.set(summary), error: () => undefined });
  }
}
