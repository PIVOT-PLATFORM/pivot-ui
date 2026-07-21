import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { TeamResponse } from '../../wheels/models/wheel.model';
import { WheelApiService } from '../../wheels/services/wheel-api.service';
import { ToastService } from '../../wheels/services/toast.service';
import { CapacityKpiComponent } from '../capacity-kpi/capacity-kpi.component';
import { CapacityEventResponse, CapacityEventStatus, CapacityEventType } from '../models/capacity.model';
import { CapacityApiService } from '../services/capacity-api.service';

/** The capacity event types offered by the type filter, in display order. */
const EVENT_TYPES: readonly CapacityEventType[] = ['PI_PLANNING', 'SPRINT', 'RELEASE', 'CUSTOM'];

/** The capacity event statuses offered by the status filter, in display order. */
const EVENT_STATUSES: readonly CapacityEventStatus[] = ['PLANNING', 'ACTIVE', 'DONE'];

/**
 * Lists the capacity events (F11) of the caller's active team, filterable by type/status, and
 * lets the caller create, edit, or delete one. Also embeds {@link CapacityKpiComponent}, anchored
 * on the team's first listed event, to surface the team-aggregate KPIs alongside the list.
 *
 * There is no shell-level "active team" concept yet (`@pivot/ui-core`/`TeamService`, EN17.3, not
 * consumable) — this component resolves the caller's teams itself (`GET /api/agilite/teams`, via
 * {@link WheelApiService}, the same generic endpoint wheel-list uses) and keeps the selected team
 * as local, session-only state — mirrors `wheel-list.component.ts`.
 */
@Component({
  selector: 'app-capacity-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslocoPipe, CapacityKpiComponent],
  templateUrl: './capacity-list.component.html',
  styleUrl: './capacity-list.component.scss',
})
export class CapacityListComponent implements OnInit {
  private readonly wheelApi = inject(WheelApiService);
  private readonly capacityApi = inject(CapacityApiService);
  private readonly toastService = inject(ToastService);

  private readonly cancelButton = viewChild<ElementRef<HTMLButtonElement>>('cancelButton');
  private triggerElement: HTMLElement | null = null;

  /** The event types offered by the type filter. */
  readonly eventTypes = EVENT_TYPES;

  /** The event statuses offered by the status filter. */
  readonly eventStatuses = EVENT_STATUSES;

  /** Teams the caller belongs to. */
  readonly teams = signal<TeamResponse[]>([]);

  /** Currently selected team, or `null` until teams have loaded. */
  readonly selectedTeamId = signal<number | null>(null);

  /** Type filter, or `''` for all types. */
  readonly selectedType = signal<CapacityEventType | ''>('');

  /** Status filter, or `''` for all statuses. */
  readonly selectedStatus = signal<CapacityEventStatus | ''>('');

  /** Capacity events of the currently selected team, matching the current filters. */
  readonly events = signal<CapacityEventResponse[]>([]);

  /** `true` if the last event-list fetch failed. */
  readonly loadError = signal(false);

  /** The event anchoring the embedded KPI cards — the team's first listed event, or `null`. */
  readonly kpiAnchorEventId = signal<string | null>(null);

  /** The event pending delete confirmation, or `null`. */
  readonly pendingDelete = signal<CapacityEventResponse | null>(null);

  /** The toasts to display, forwarded from {@link ToastService}. */
  readonly toasts = this.toastService.toasts;

  constructor() {
    effect(() => {
      if (this.pendingDelete()) {
        this.cancelButton()?.nativeElement.focus();
      }
    });
  }

  /** Loads the caller's teams and, once available, the capacity events of the first one. */
  ngOnInit(): void {
    this.wheelApi.listTeams().subscribe({
      next: (teams) => {
        this.teams.set(teams);
        if (teams.length > 0) {
          this.selectedTeamId.set(teams[0].id);
          this.loadEvents();
        }
      },
      error: () => this.loadError.set(true),
    });
  }

  /** Handles a team selection change from the `<select>` element. */
  onTeamChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedTeamId.set(Number(value));
    this.loadEvents();
  }

  /** Handles a type filter change from the `<select>` element. */
  onTypeChange(event: Event): void {
    this.selectedType.set((event.target as HTMLSelectElement).value as CapacityEventType | '');
    this.loadEvents();
  }

  /** Handles a status filter change from the `<select>` element. */
  onStatusChange(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value as CapacityEventStatus | '');
    this.loadEvents();
  }

  /** (Re)loads the capacity events of the currently selected team, applying the current filters. */
  loadEvents(): void {
    const teamId = this.selectedTeamId();
    if (teamId === null) {
      return;
    }
    this.loadError.set(false);
    const type = this.selectedType() || undefined;
    const status = this.selectedStatus() || undefined;
    this.capacityApi.listEvents(teamId, type, status).subscribe({
      next: (events) => {
        this.events.set(events);
        this.kpiAnchorEventId.set(events.length > 0 ? events[0].id : null);
      },
      error: () => this.loadError.set(true),
    });
  }

  /**
   * Opens the delete confirmation dialog for an event, remembering the triggering button so
   * focus can be restored to it once the dialog closes.
   *
   * @param event   the capacity event to potentially delete
   * @param clickEvent the click event that triggered this action
   */
  requestDelete(event: CapacityEventResponse, clickEvent: Event): void {
    this.triggerElement = clickEvent.currentTarget as HTMLElement;
    this.pendingDelete.set(event);
  }

  /** Cancels the pending delete and restores focus to the triggering button. */
  cancelDelete(): void {
    this.pendingDelete.set(null);
    this.restoreFocus();
  }

  /**
   * Confirms deletion of the pending event, refreshes the list on success, and restores focus.
   *
   * @param event the capacity event to delete
   */
  confirmDelete(event: CapacityEventResponse): void {
    this.capacityApi.deleteEvent(event.id).subscribe({
      next: () => {
        this.pendingDelete.set(null);
        this.restoreFocus();
        this.toastService.show('capacity.list.deleteSuccess', 'success');
        this.loadEvents();
      },
      error: () => {
        this.pendingDelete.set(null);
        this.restoreFocus();
        this.toastService.show('capacity.list.deleteError', 'error');
      },
    });
  }

  /** Dismisses the given toast. */
  dismissToast(id: number): void {
    this.toastService.dismiss(id);
  }

  private restoreFocus(): void {
    this.triggerElement?.focus();
    this.triggerElement = null;
  }
}
