import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { StandupStatsResponse } from '../models/standup.model';
import { StandupApiService } from '../services/standup-api.service';

/** Quick period-shortcut options, mirroring the AC's "7 jours / 30 jours / période personnalisée". */
type PeriodShortcut = '7d' | '30d' | 'custom';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A single bar of the per-participant speaking-time chart, pre-scaled to [0, 100]. */
interface ChartBar {
  readonly name: string;
  readonly totalSpeakingSeconds: number;
  readonly sessionCount: number;
  readonly widthPercent: number;
}

/**
 * Statistics view for a team's completed daily standup sessions (US10.3.1): a sessions list
 * (date, duration) and a plain-SVG bar chart of average speaking time per participant. No
 * charting library — per ADR-007 (Angular CDK + SCSS BEM only, no third-party visual lib).
 */
@Component({
  selector: 'app-standup-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './standup-stats.component.html',
  styleUrl: './standup-stats.component.scss',
})
export class StandupStatsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly standupApi = inject(StandupApiService);

  private readonly teamId: number | null;

  readonly period = signal<PeriodShortcut>('30d');
  readonly customFrom = signal('');
  readonly customTo = signal('');
  readonly stats = signal<StandupStatsResponse | null>(null);
  readonly loadError = signal(false);

  readonly chartBars = computed<ChartBar[]>(() => {
    const participants = this.stats()?.participants ?? [];
    const max = Math.max(1, ...participants.map(p => p.totalSpeakingSeconds));
    return participants.map(p => ({
      name: p.name,
      totalSpeakingSeconds: p.totalSpeakingSeconds,
      sessionCount: p.sessionCount,
      widthPercent: Math.round((p.totalSpeakingSeconds / max) * 100),
    }));
  });

  readonly isEmpty = computed(() => {
    const stats = this.stats();
    return stats !== null && stats.sessions.length === 0 && stats.participants.length === 0;
  });

  constructor() {
    const teamIdParam = this.route.snapshot.queryParamMap.get('teamId');
    this.teamId = teamIdParam !== null ? Number(teamIdParam) : null;
  }

  ngOnInit(): void {
    if (this.teamId === null) {
      this.loadError.set(true);
      return;
    }
    this.load();
  }

  /** Switches the active period shortcut and reloads, unless switching to `'custom'` (waits for dates). */
  onPeriodChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as PeriodShortcut;
    this.period.set(value);
    if (value !== 'custom') {
      this.load();
    }
  }

  /** Updates the custom range's lower bound. */
  onCustomFromInput(event: Event): void {
    this.customFrom.set((event.target as HTMLInputElement).value);
  }

  /** Updates the custom range's upper bound. */
  onCustomToInput(event: Event): void {
    this.customTo.set((event.target as HTMLInputElement).value);
  }

  /** Applies the custom date range and reloads. */
  applyCustomRange(): void {
    this.load();
  }

  /** (Re)loads the stats for the currently selected period. */
  load(): void {
    if (this.teamId === null) {
      return;
    }
    this.loadError.set(false);
    const { from, to } = this.resolveRange();
    this.standupApi.getStats(this.teamId, from, to).subscribe({
      next: stats => this.stats.set(stats),
      error: () => this.loadError.set(true),
    });
  }

  private resolveRange(): { from?: string; to?: string } {
    const period = this.period();
    if (period === 'custom') {
      return {
        from: this.customFrom() || undefined,
        to: this.customTo() || undefined,
      };
    }
    const days = period === '7d' ? 7 : 30;
    const to = new Date();
    const from = new Date(to.getTime() - days * DAY_MS);
    return { from: toIsoDate(from), to: toIsoDate(to) };
  }
}

/**
 * Formats a `Date` as an ISO-8601 calendar date (`YYYY-MM-DD`), the format the backend's
 * `@DateTimeFormat(iso = ISO.DATE)` query params expect.
 *
 * @param date the date to format
 * @returns the `YYYY-MM-DD` string
 */
function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
