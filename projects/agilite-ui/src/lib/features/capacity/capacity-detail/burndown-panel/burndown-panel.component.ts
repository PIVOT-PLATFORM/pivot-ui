import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CapacityBurndownPoint } from '../../models/capacity.model';
import { CapacityApiService } from '../../services/capacity-api.service';

/** SVG viewport dimensions for the burndown chart. */
const CHART_WIDTH = 480;
const CHART_HEIGHT = 220;
const CHART_PADDING = 24;

/** One point on either burndown line, laid out in SVG coordinates. */
export interface BurndownPlotPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Burndown tab (F11 capacity detail) — renders the sprint's real + ideal remaining-points lines
 * (`getBurndown`) as a small hand-rolled inline SVG (no chart library is a dependency of this
 * repo — see the task report), plus a plain data table underneath for accessibility/precise
 * values (an SVG polyline conveys the trend but not exact readings to a screen reader).
 */
@Component({
  selector: 'app-capacity-burndown-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './burndown-panel.component.html',
  styleUrl: './burndown-panel.component.scss',
})
export class BurndownPanelComponent implements OnInit {
  private readonly capacityApi = inject(CapacityApiService);

  /** The sprint event's id whose burndown is being displayed. */
  readonly eventId = input.required<string>();

  /** The real (actual) burndown line. */
  readonly real = signal<readonly CapacityBurndownPoint[]>([]);

  /** The derived ideal burndown line. */
  readonly ideal = signal<readonly CapacityBurndownPoint[]>([]);

  /** `true` if the burndown failed to load. */
  readonly loadError = signal(false);

  /** SVG chart width/height/padding, exposed to the template for the `viewBox`. */
  readonly chartWidth = CHART_WIDTH;
  readonly chartHeight = CHART_HEIGHT;

  /** The maximum `pointsRestants` across both lines, used to scale the vertical axis. */
  private readonly maxPoints = computed(() => {
    const all = [...this.real(), ...this.ideal()];
    return Math.max(1, ...all.map((p) => p.pointsRestants));
  });

  /** The real line's points, mapped to an SVG `points` attribute string. */
  readonly realPolylinePoints = computed(() => this.toPolylinePoints(this.real()));

  /** The ideal line's points, mapped to an SVG `points` attribute string. */
  readonly idealPolylinePoints = computed(() => this.toPolylinePoints(this.ideal()));

  ngOnInit(): void {
    this.loadBurndown();
  }

  /** (Re)loads the burndown data. */
  loadBurndown(): void {
    this.loadError.set(false);
    this.capacityApi.getBurndown(this.eventId()).subscribe({
      next: (response) => {
        this.real.set(response.real);
        this.ideal.set(response.ideal);
      },
      error: () => this.loadError.set(true),
    });
  }

  /**
   * Maps a burndown line to an SVG `<polyline points="...">` value, evenly spacing points along
   * the X axis (by index — burndown readings are already date-ordered) and scaling Y to
   * {@link maxPoints}, both within {@link CHART_PADDING} of the viewport edges.
   *
   * @param points the burndown line to plot
   * @returns the `points` attribute value, or `''` when there is nothing to plot
   */
  private toPolylinePoints(points: readonly CapacityBurndownPoint[]): string {
    if (points.length === 0) {
      return '';
    }
    const innerWidth = CHART_WIDTH - 2 * CHART_PADDING;
    const innerHeight = CHART_HEIGHT - 2 * CHART_PADDING;
    const max = this.maxPoints();
    const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;

    return points
      .map((point, index) => {
        const x = CHART_PADDING + index * step;
        const y = CHART_PADDING + innerHeight * (1 - point.pointsRestants / max);
        return `${x},${y}`;
      })
      .join(' ');
  }
}
