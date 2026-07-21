import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * The board's zoom control cluster (US08.11.2).
 *
 * Purely presentational: it renders the current zoom and emits intent, while the arithmetic and
 * the bounds live on the canvas, which is the only thing that knows the surface size and the
 * board's content. That split is what lets the same commands be driven from elsewhere later
 * (keyboard shortcuts, a command palette) without duplicating the clamping rules.
 */
@Component({
  selector: 'wb-zoom-controls',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './zoom-controls.component.html',
  styleUrl: './zoom-controls.component.scss',
})
export class ZoomControlsComponent {
  /** Current zoom factor (1 = 100 %). */
  readonly zoom = input.required<number>();
  /** Whether anything is selected — gates "fit to selection". */
  readonly hasSelection = input<boolean>(false);

  readonly zoomIn = output<void>();
  readonly zoomOut = output<void>();
  readonly resetZoom = output<void>();
  readonly fitContent = output<void>();
  readonly fitSelection = output<void>();

  /**
   * Zoom as a whole percentage.
   *
   * Rounded rather than truncated so 0.999 reads as "100 %" instead of "99 %" — the reset button
   * must not appear to have missed its target.
   */
  protected readonly percent = computed(() => Math.round(this.zoom() * 100));
}
