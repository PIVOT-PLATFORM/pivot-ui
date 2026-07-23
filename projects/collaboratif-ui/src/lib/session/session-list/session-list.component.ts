import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { SessionStatus, SessionSummaryResponse } from '../models/session.model';
import { SessionApiService } from '../services/session-api.service';

/** Status filter options exposed by the list, `'ALL'` meaning no `status` query param. */
type StatusFilter = SessionStatus | 'ALL';

/**
 * Lists the live sessions accessible to the caller (creator, or member of the session's team
 * when one is set) and lets the caller create a new one or open an existing one (US19.1.1).
 * `teamId` is optional at the model level — this list shows every accessible session regardless
 * of team scoping unless the caller narrows it via the filter.
 */
@Component({
  selector: 'app-session-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslocoPipe],
  templateUrl: './session-list.component.html',
  styleUrl: './session-list.component.scss',
})
export class SessionListComponent implements OnInit {
  private readonly sessionApi = inject(SessionApiService);

  readonly sessions = signal<SessionSummaryResponse[]>([]);
  readonly statusFilter = signal<StatusFilter>('ALL');
  readonly loadError = signal(false);

  ngOnInit(): void {
    this.loadSessions();
  }

  /** Switches the status filter and reloads. */
  onStatusFilterChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilter);
    this.loadSessions();
  }

  /** (Re)loads the caller's accessible sessions, honoring the status filter. */
  loadSessions(): void {
    this.loadError.set(false);
    const filter = this.statusFilter();
    this.sessionApi.listSessions(filter === 'ALL' ? {} : { status: filter }).subscribe({
      next: sessions => this.sessions.set(sessions),
      error: () => this.loadError.set(true),
    });
  }
}
