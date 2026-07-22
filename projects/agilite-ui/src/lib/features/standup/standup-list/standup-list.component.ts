import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { StandupSessionResponse, StandupSessionStatus, TeamResponse } from '../models/standup.model';
import { StandupApiService } from '../services/standup-api.service';

/** Status filter options exposed by the list, `'ALL'` meaning no `status` query param. */
type StatusFilter = StandupSessionStatus | 'ALL';

/**
 * Lists the daily standup sessions of the caller's selected team, and lets the caller create a
 * new one, jump into a session (runner or read-only recap), or delete a `PENDING`/`DONE` one
 * (US10.1.1). Structurally mirrors `wheels/wheel-list/wheel-list.component.ts` — same
 * no-shell-level-active-team resolution (`GET /api/agilite/teams`, local session-only selection).
 */
@Component({
  selector: 'app-standup-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslocoPipe],
  templateUrl: './standup-list.component.html',
  styleUrl: './standup-list.component.scss',
})
export class StandupListComponent implements OnInit {
  private readonly standupApi = inject(StandupApiService);

  readonly teams = signal<TeamResponse[]>([]);
  readonly selectedTeamId = signal<number | null>(null);
  readonly sessions = signal<StandupSessionResponse[]>([]);
  readonly statusFilter = signal<StatusFilter>('ALL');
  readonly loadError = signal(false);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly deleteError = signal<string | null>(null);

  ngOnInit(): void {
    this.standupApi.listTeams().subscribe({
      next: teams => {
        this.teams.set(teams);
        if (teams.length > 0) {
          this.selectedTeamId.set(teams[0].id);
          this.loadSessions();
        }
      },
      error: () => this.loadError.set(true),
    });
  }

  /** Switches the active team and reloads its sessions. */
  onTeamChange(event: Event): void {
    const teamId = Number((event.target as HTMLSelectElement).value);
    this.selectedTeamId.set(teamId);
    this.loadSessions();
  }

  /** Switches the status filter and reloads. */
  onStatusFilterChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilter);
    this.loadSessions();
  }

  /** (Re)loads the sessions of the currently selected team, honoring the status filter. */
  loadSessions(): void {
    const teamId = this.selectedTeamId();
    if (teamId === null) {
      return;
    }
    this.loadError.set(false);
    const filter = this.statusFilter();
    this.standupApi.listSessions(teamId, filter === 'ALL' ? undefined : filter).subscribe({
      next: sessions => this.sessions.set(sessions),
      error: () => this.loadError.set(true),
    });
  }

  /** Requests confirmation before deleting a session. */
  requestDelete(sessionId: string): void {
    this.deleteError.set(null);
    this.pendingDeleteId.set(sessionId);
  }

  /** Cancels a pending delete confirmation. */
  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  /** Confirms deletion of the session currently pending confirmation. */
  confirmDelete(): void {
    const sessionId = this.pendingDeleteId();
    if (sessionId === null) {
      return;
    }
    this.standupApi.deleteSession(sessionId).subscribe({
      next: () => {
        this.pendingDeleteId.set(null);
        this.sessions.update(list => list.filter(s => s.id !== sessionId));
      },
      error: () => {
        // A RUNNING session cannot be deleted (409) — surfaced inline, confirmation stays open.
        this.deleteError.set('standup.list.deleteError');
      },
    });
  }
}
