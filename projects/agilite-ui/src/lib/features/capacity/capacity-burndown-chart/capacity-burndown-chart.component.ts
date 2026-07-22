import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { BurndownPoint, CapacityBurndownResponse } from '../models/capacity.model';
import { CapacityApiService } from '../services/capacity-api.service';

const VIEWBOX_WIDTH = 400;
const VIEWBOX_HEIGHT = 200;
const PADDING = 10;

/**
 * Burndown chart for a `SPRINT` event (US11.4.2) — plain `<svg>` two-`<polyline>` chart (ideal +
 * actual), no third-party charting library (ADR-007), same SVG-overlay coordinate-computation
 * style as `pi-planning/pi-dependency-layer` for code-style consistency, but simpler here: no DOM
 * measurement is needed, points are derived purely from the fetched data via computed signals.
 */
@Component({
  selector: 'app-capacity-burndown-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './capacity-burndown-chart.component.html',
  styleUrl: './capacity-burndown-chart.component.scss',
})
export class CapacityBurndownChartComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly capacityApi = inject(CapacityApiService);

  private readonly eventId: string;

  readonly burndown = signal<CapacityBurndownResponse | null>(null);
  readonly loadError = signal(false);
  readonly entryDate = signal('');
  readonly entryPoints = signal('');
  readonly saveError = signal<string | null>(null);

  readonly isEmpty = computed(() => {
    const b = this.burndown();
    return b !== null && b.actual.length === 0;
  });

  readonly maxPoints = computed(() => {
    const b = this.burndown();
    if (!b) {
      return 1;
    }
    const values = [...b.ideal, ...b.actual].map(p => p.pointsRemaining);
    return Math.max(1, ...values);
  });

  readonly idealPolyline = computed(() => this.toPolyline(this.burndown()?.ideal ?? []));
  readonly actualPolyline = computed(() => this.toPolyline(this.burndown()?.actual ?? []));

  readonly viewBox = `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`;

  constructor() {
    this.eventId = this.route.snapshot.paramMap.get('eventId') ?? '';
  }

  ngOnInit(): void {
    this.load();
  }

  /** (Re)loads the burndown payload. */
  load(): void {
    if (this.eventId === '') {
      this.loadError.set(true);
      return;
    }
    this.loadError.set(false);
    this.capacityApi.getBurndown(this.eventId).subscribe({
      next: burndown => this.burndown.set(burndown),
      error: () => this.loadError.set(true),
    });
  }

  /** Updates the entry-date draft. */
  onEntryDateInput(event: Event): void {
    this.entryDate.set((event.target as HTMLInputElement).value);
  }

  /** Updates the entry-points draft. */
  onEntryPointsInput(event: Event): void {
    this.entryPoints.set((event.target as HTMLInputElement).value);
  }

  /** Submits (or replaces) today's — or the chosen date's — remaining-points entry. */
  submitEntry(): void {
    const date = this.entryDate();
    const points = Number(this.entryPoints());
    if (date === '' || Number.isNaN(points) || points < 0) {
      return;
    }
    this.saveError.set(null);
    this.capacityApi.upsertBurndownEntry(this.eventId, date, points).subscribe({
      next: () => {
        this.entryPoints.set('');
        this.load();
      },
      error: () => this.saveError.set('capacityPlanning.burndown.saveError'),
    });
  }

  private toPolyline(points: readonly BurndownPoint[]): string {
    if (points.length === 0) {
      return '';
    }
    const max = this.maxPoints();
    const innerWidth = VIEWBOX_WIDTH - PADDING * 2;
    const innerHeight = VIEWBOX_HEIGHT - PADDING * 2;
    return points
      .map((p, i) => {
        const x = PADDING + (points.length === 1 ? 0 : (i / (points.length - 1)) * innerWidth);
        const y = PADDING + innerHeight - (p.pointsRemaining / max) * innerHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }
}
