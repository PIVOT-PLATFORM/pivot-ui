import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CapacityMaturityLevel, CapacityTeamMaturityResponse } from '../models/capacity.model';
import { CapacityApiService } from '../services/capacity-api.service';

/** Maturity options offered by the selector, in ascending-maturity order (US11.6.4 AC). */
export const CAPACITY_MATURITY_LEVELS: readonly CapacityMaturityLevel[] = ['FORMING', 'NORMING', 'PERFORMING'];

/**
 * A team's agile-maturity setting (US11.6.4) — a standalone screen rather than a new tab bolted
 * onto an existing team-management page (none of which this module owns or has full context on;
 * see US11.6.4 §Notes d'implémentation — "à trancher en implémentation selon ce qui existe déjà").
 * Sets the team's tier and shows the effective focus-factor/margin defaults that flow from it —
 * an explicit per-event/per-member focus factor (US11.6.2) always prevails over this default.
 */
@Component({
  selector: 'app-capacity-team-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './capacity-team-settings.component.html',
  styleUrl: './capacity-team-settings.component.scss',
})
export class CapacityTeamSettingsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly capacityApi = inject(CapacityApiService);

  private readonly teamId: number;

  readonly maturityLevels = CAPACITY_MATURITY_LEVELS;
  readonly setting = signal<CapacityTeamMaturityResponse | null>(null);
  readonly loadError = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal(false);

  constructor() {
    this.teamId = Number(this.route.snapshot.paramMap.get('teamId') ?? '');
  }

  ngOnInit(): void {
    this.load();
  }

  /** (Re)loads the team's maturity setting and effective defaults. */
  load(): void {
    this.loadError.set(false);
    this.capacityApi.getTeamMaturity(this.teamId).subscribe({
      next: setting => this.setting.set(setting),
      error: () => this.loadError.set(true),
    });
  }

  /** Sets the team's maturity tier. An explicit event/member focus factor still prevails (US11.6.4). */
  selectMaturity(maturity: CapacityMaturityLevel): void {
    this.saving.set(true);
    this.saveError.set(false);
    this.capacityApi.updateTeamMaturity(this.teamId, { maturity }).subscribe({
      next: setting => {
        this.saving.set(false);
        this.setting.set(setting);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set(true);
      },
    });
  }
}
