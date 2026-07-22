import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { PiCycleSummaryResponse } from '../models/pi-planning.model';
import { PiCycleApiService } from '../services/pi-cycle-api.service';

/**
 * Lists the PI cycles accessible to the caller (creator or member of an imported Train team,
 * US50.1.1 §Architecture) and lets the caller create a new one or jump into a cycle's detail or
 * board. Structurally mirrors `standup/standup-list/standup-list.component.ts` — no team
 * selector here though, since a cycle's access spans multiple Train teams rather than a single
 * owning team (US50.1.1 §Architecture — modèle d'accès Train).
 */
@Component({
  selector: 'app-pi-cycle-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslocoPipe],
  templateUrl: './pi-cycle-list.component.html',
  styleUrl: './pi-cycle-list.component.scss',
})
export class PiCycleListComponent implements OnInit {
  private readonly piCycleApi = inject(PiCycleApiService);

  readonly cycles = signal<PiCycleSummaryResponse[]>([]);
  readonly loadError = signal(false);
  readonly loaded = signal(false);

  ngOnInit(): void {
    this.loadCycles();
  }

  /** (Re)loads the list of accessible cycles. */
  loadCycles(): void {
    this.loadError.set(false);
    this.piCycleApi.listCycles().subscribe({
      next: cycles => {
        this.cycles.set(cycles);
        this.loaded.set(true);
      },
      error: () => {
        this.loadError.set(true);
        this.loaded.set(true);
      },
    });
  }
}
