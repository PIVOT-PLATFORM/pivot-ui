import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CapacityEventSummaryResponse, CapacityEventType, CreateCapacityEventRequest } from '../models/capacity.model';
import { extractErrorCode } from '../services/capacity-error.util';
import { CapacityApiService } from '../services/capacity-api.service';

/** Type options offered by the picker, in display order (US11.1.1 AC). */
export const CAPACITY_EVENT_TYPES: readonly CapacityEventType[] = ['PI_PLANNING', 'SPRINT', 'RELEASE', 'CUSTOM'];

/**
 * Creates a new capacity event (US11.1.1) — type, name, dates, and (for non-`PI_PLANNING` types)
 * an optional `parentEventId` limited to the team's accessible `PI_PLANNING` events (US11.3.1).
 * No member picker here: members are auto-seeded server-side from the team roster for non-PI
 * types (US11.2.1) — a `PI_PLANNING` event has no members of its own.
 */
@Component({
  selector: 'app-capacity-event-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './capacity-event-form.component.html',
  styleUrl: './capacity-event-form.component.scss',
})
export class CapacityEventFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly capacityApi = inject(CapacityApiService);

  private readonly teamId: number | null;

  readonly eventTypes = CAPACITY_EVENT_TYPES;

  readonly type = signal<CapacityEventType>('SPRINT');
  readonly name = signal('');
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly parentEventId = signal<string | null>(null);
  readonly piEvents = signal<CapacityEventSummaryResponse[]>([]);
  readonly saving = signal(false);
  readonly saveNetworkError = signal(false);
  readonly fieldErrorCode = signal<string | null>(null);

  /** `parentEventId` is only meaningful for non-`PI_PLANNING` types (US11.1.1 AC). */
  readonly showParentPicker = computed(() => this.type() !== 'PI_PLANNING');

  readonly canSave = computed(
    () =>
      this.name().trim().length > 0 &&
      this.startDate().trim().length > 0 &&
      this.endDate().trim().length > 0 &&
      !this.saving(),
  );

  constructor() {
    const teamIdParam = this.route.snapshot.queryParamMap.get('teamId');
    this.teamId = teamIdParam !== null ? Number(teamIdParam) : null;
  }

  ngOnInit(): void {
    if (this.teamId === null) {
      return;
    }
    this.capacityApi.listEvents(this.teamId, 'PI_PLANNING').subscribe({
      next: events => this.piEvents.set(events),
      // A failed PI-list fetch doesn't block creating a non-PI event without a parent.
      error: () => this.piEvents.set([]),
    });
  }

  /** Updates the event type; clears the parent selection when switching to `PI_PLANNING`. */
  onTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as CapacityEventType;
    this.type.set(value);
    if (value === 'PI_PLANNING') {
      this.parentEventId.set(null);
    }
  }

  /** Updates the event name from the name input. */
  onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  /** Updates the start date from the date input. */
  onStartDateInput(event: Event): void {
    this.startDate.set((event.target as HTMLInputElement).value);
  }

  /** Updates the end date from the date input. */
  onEndDateInput(event: Event): void {
    this.endDate.set((event.target as HTMLInputElement).value);
  }

  /** Updates the selected parent PI Planning event, or clears it. */
  onParentChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.parentEventId.set(value === '' ? null : value);
  }

  /** Submits the event creation request. */
  save(): void {
    if (!this.canSave() || this.teamId === null) {
      return;
    }
    this.saving.set(true);
    this.fieldErrorCode.set(null);
    this.saveNetworkError.set(false);

    const request: CreateCapacityEventRequest = {
      type: this.type(),
      name: this.name().trim(),
      teamId: this.teamId,
      startDate: this.startDate(),
      endDate: this.endDate(),
    };
    const parentEventId = this.parentEventId();
    if (parentEventId !== null) {
      request.parentEventId = parentEventId;
    }

    this.capacityApi.createEvent(request).subscribe({
      next: created => {
        this.saving.set(false);
        this.router.navigate(['/capacity', created.id]);
      },
      error: error => {
        this.saving.set(false);
        const code = extractErrorCode(error);
        if (code) {
          this.fieldErrorCode.set(code);
        } else {
          this.saveNetworkError.set(true);
        }
      },
    });
  }
}
