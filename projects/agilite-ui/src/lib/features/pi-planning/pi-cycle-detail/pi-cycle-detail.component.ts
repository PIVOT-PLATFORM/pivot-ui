import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { PiCycleResponse, TeamResponse } from '../models/pi-planning.model';
import { extractErrorCode } from '../services/pi-error.util';
import { PiCycleApiService } from '../services/pi-cycle-api.service';

/**
 * Detail view of a PI cycle (US50.1.1) — iterations, Train teams (import from the caller's own
 * PIVOT teams via a checklist, or add manually for external partners), and a link to the
 * Program Board. Access (read/manage) is derived from cycle membership, not a route guard here —
 * a 404 on the initial `getCycle` load is surfaced as a generic load error, never distinguishing
 * "not found" from "not a member" (US50.1.1 §Architecture — anti-enumeration).
 */
@Component({
  selector: 'app-pi-cycle-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './pi-cycle-detail.component.html',
  styleUrl: './pi-cycle-detail.component.scss',
})
export class PiCycleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly piCycleApi = inject(PiCycleApiService);

  private readonly cycleId: string;

  readonly cycle = signal<PiCycleResponse | null>(null);
  readonly loadError = signal(false);

  readonly myTeams = signal<TeamResponse[]>([]);
  readonly selectedImportIds = signal<number[]>([]);
  readonly importing = signal(false);
  readonly importError = signal<string | null>(null);

  readonly manualTeamName = signal('');
  readonly addingManualTeam = signal(false);
  readonly manualTeamError = signal<string | null>(null);

  /** Own teams not already imported into this cycle (drives the import checklist's candidates). */
  readonly importableTeams = computed(() => {
    const cycle = this.cycle();
    if (!cycle) {
      return [];
    }
    const alreadyImported = new Set(
      cycle.teams.map(t => t.sourceTeamId).filter((id): id is number => id !== null),
    );
    return this.myTeams().filter(team => !alreadyImported.has(team.id));
  });

  constructor() {
    this.cycleId = this.route.snapshot.paramMap.get('cycleId') ?? '';
  }

  ngOnInit(): void {
    this.loadCycle();
    this.piCycleApi.listTeams().subscribe({ next: teams => this.myTeams.set(teams) });
  }

  /** (Re)loads the cycle. */
  loadCycle(): void {
    this.loadError.set(false);
    this.piCycleApi.getCycle(this.cycleId).subscribe({
      next: cycle => this.cycle.set(cycle),
      error: () => this.loadError.set(true),
    });
  }

  /** Toggles a PIVOT team's selection in the import checklist. */
  onImportToggle(teamId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedImportIds.update(ids =>
      checked ? [...ids, teamId] : ids.filter(id => id !== teamId),
    );
  }

  /** Imports the checked teams as Train-team snapshots. */
  importSelected(): void {
    const ids = this.selectedImportIds();
    if (ids.length === 0 || this.importing()) {
      return;
    }
    this.importing.set(true);
    this.importError.set(null);
    this.piCycleApi.importTeams(this.cycleId, ids).subscribe({
      next: () => {
        this.importing.set(false);
        this.selectedImportIds.set([]);
        this.loadCycle();
      },
      error: error => {
        this.importing.set(false);
        this.importError.set(extractErrorCode(error) ?? 'NETWORK_ERROR');
      },
    });
  }

  /** Updates the manual Train-team name input. */
  onManualTeamNameInput(event: Event): void {
    this.manualTeamName.set((event.target as HTMLInputElement).value);
  }

  /** Adds a manually-entered Train team (external partner, no PIVOT team behind it). */
  addManualTeam(): void {
    const name = this.manualTeamName().trim();
    if (name.length === 0 || this.addingManualTeam()) {
      return;
    }
    this.addingManualTeam.set(true);
    this.manualTeamError.set(null);
    this.piCycleApi.addManualTeam(this.cycleId, { name }).subscribe({
      next: () => {
        this.addingManualTeam.set(false);
        this.manualTeamName.set('');
        this.loadCycle();
      },
      error: error => {
        this.addingManualTeam.set(false);
        this.manualTeamError.set(extractErrorCode(error) ?? 'NETWORK_ERROR');
      },
    });
  }

  /** Removes a Train team from the cycle — its tickets fall back to "Unplanned", never deleted. */
  removeTeam(teamId: string): void {
    this.piCycleApi.deleteTeam(this.cycleId, teamId).subscribe({ next: () => this.loadCycle() });
  }
}
