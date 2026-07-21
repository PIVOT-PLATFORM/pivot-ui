import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CapacitySummaryResponse } from '../../models/capacity.model';

/**
 * Summary tab (F11.6.5 + F11.6.6) — event totals, per-member breakdown table, optional PI
 * consolidation, and the engagement gauge (with a `overCommitted` visual alert).
 *
 * Purely presentational: the summary is fetched by the parent (`CapacityDetailComponent`, shared
 * with the members tab) and passed in, rather than fetched again here.
 */
@Component({
  selector: 'app-capacity-summary-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './summary-panel.component.html',
  styleUrl: './summary-panel.component.scss',
})
export class SummaryPanelComponent {
  /** The full capacity summary to render, or `null` while loading. */
  readonly summary = input<CapacitySummaryResponse | null>(null);

  /** `true` if the summary failed to load. */
  readonly loadError = input(false);

  /**
   * Clamps a gauge ratio to `[0, 1]` for use as a CSS custom property driving the fill bar's
   * width — `engagementRatio` can exceed `1` when over-committed, which must not overflow the bar.
   *
   * @param ratio the raw engagement ratio, or `null`
   * @returns the clamped ratio, or `0` when `null`
   */
  clampedRatio(ratio: number | null): number {
    if (ratio === null) {
      return 0;
    }
    return Math.min(1, Math.max(0, ratio));
  }
}
