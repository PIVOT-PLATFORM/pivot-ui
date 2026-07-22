import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CapacityEventSummaryResponse, CapacityEventType, TeamResponse } from '../models/capacity.model';
import { CapacityApiService } from '../services/capacity-api.service';

/** Type filter options exposed by the list, `'ALL'` meaning no `type` query param. */
type TypeFilter = CapacityEventType | 'ALL';

/**
 * Lists the capacity events of the caller's selected team, and lets the caller create a new one
 * or jump into an event's detail (US11.1.1). Structurally mirrors
 * `standup/standup-list/standup-list.component.ts` — same team-selection convention.
 */
@Component({
  selector: 'app-capacity-event-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslocoPipe],
  templateUrl: './capacity-event-list.component.html',
  styleUrl: './capacity-event-list.component.scss',
})
export class CapacityEventListComponent implements OnInit {
  private readonly capacityApi = inject(CapacityApiService);

  readonly teams = signal<TeamResponse[]>([]);
  readonly selectedTeamId = signal<number | null>(null);
  readonly events = signal<CapacityEventSummaryResponse[]>([]);
  readonly typeFilter = signal<TypeFilter>('ALL');
  readonly loadError = signal(false);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly deleteError = signal<string | null>(null);

  ngOnInit(): void {
    this.capacityApi.listTeams().subscribe({
      next: teams => {
        this.teams.set(teams);
        if (teams.length > 0) {
          this.selectedTeamId.set(teams[0].id);
          this.loadEvents();
        }
      },
      error: () => this.loadError.set(true),
    });
  }

  /** Switches the active team and reloads its events. */
  onTeamChange(event: Event): void {
    const teamId = Number((event.target as HTMLSelectElement).value);
    this.selectedTeamId.set(teamId);
    this.loadEvents();
  }

  /** Switches the type filter and reloads. */
  onTypeFilterChange(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value as TypeFilter);
    this.loadEvents();
  }

  /** (Re)loads the events of the currently selected team, honoring the type filter. */
  loadEvents(): void {
    const teamId = this.selectedTeamId();
    if (teamId === null) {
      return;
    }
    this.loadError.set(false);
    const filter = this.typeFilter();
    this.capacityApi.listEvents(teamId, filter === 'ALL' ? undefined : filter).subscribe({
      next: events => this.events.set(events),
      error: () => this.loadError.set(true),
    });
  }

  /** Requests confirmation before deleting an event. */
  requestDelete(eventId: string): void {
    this.deleteError.set(null);
    this.pendingDeleteId.set(eventId);
  }

  /** Cancels a pending delete confirmation. */
  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  /** Confirms deletion of the event currently pending confirmation. */
  confirmDelete(): void {
    const eventId = this.pendingDeleteId();
    if (eventId === null) {
      return;
    }
    this.capacityApi.deleteEvent(eventId).subscribe({
      next: () => {
        this.pendingDeleteId.set(null);
        this.events.update(list => list.filter(e => e.id !== eventId));
      },
      error: () => {
        // An event with children cannot be deleted (409) — surfaced inline, confirmation stays open.
        this.deleteError.set('capacityPlanning.list.deleteError');
      },
    });
  }
}
