import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PiDependencyResponse, PiDependencyStatus } from '../models/pi-planning.model';

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Arrow {
  readonly dependency: PiDependencyResponse;
  readonly path: string;
  readonly midpoint: Point;
}

/**
 * SVG overlay of Program Board dependency arrows (US50.3.2) — absolutely positioned inside the
 * board's scrollable wrapper so arrows scroll with the grid content (no recompute on scroll,
 * only on resize/content change). Anchors are the ticket card DOM elements themselves
 * (`[data-ticket-id]`), looked up via `wrapperElement().querySelector` and tracked with a
 * `ResizeObserver` on the wrapper — reimplemented from the reference POC's
 * `dependency-layer.tsx` (which uses React refs + `useLayoutEffect`) using Angular signals and
 * an `effect()` instead; never copied verbatim.
 */
@Component({
  selector: 'app-pi-dependency-layer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './pi-dependency-layer.component.html',
  styleUrl: './pi-dependency-layer.component.scss',
})
export class PiDependencyLayerComponent implements OnDestroy {
  readonly dependencies = input<PiDependencyResponse[]>([]);
  readonly wrapperElement = input<HTMLElement | null>(null);
  /** Changes whenever a ticket's placement may have moved — forces an arrow recompute. */
  readonly revision = input<string>('');
  readonly canEdit = input(false);

  readonly updateDependency = output<{ depId: string; patch: { status?: PiDependencyStatus; note?: string | null } }>();
  readonly deleteDependency = output<string>();

  readonly arrows = signal<Arrow[]>([]);
  readonly openDependencyId = signal<string | null>(null);
  readonly noteDraft = signal('');

  private resizeObserver: ResizeObserver | null = null;

  readonly openArrow = computed(() => this.arrows().find(a => a.dependency.id === this.openDependencyId()) ?? null);

  constructor() {
    effect(() => {
      // Read the reactive dependencies this effect must rerun on, then recompute.
      this.dependencies();
      this.revision();
      const wrapper = this.wrapperElement();
      this.recompute(wrapper);
      this.observeResize(wrapper);
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  /** Opens the status/note popover for a dependency arrow. */
  openPopover(dependencyId: string): void {
    const dependency = this.dependencies().find(d => d.id === dependencyId);
    this.noteDraft.set(dependency?.note ?? '');
    this.openDependencyId.set(dependencyId);
  }

  /** Closes the popover. */
  closePopover(): void {
    this.openDependencyId.set(null);
  }

  /** Sets the open dependency's status to OK or BLOCKED. */
  setStatus(status: PiDependencyStatus): void {
    const dependencyId = this.openDependencyId();
    if (dependencyId === null) {
      return;
    }
    this.updateDependency.emit({ depId: dependencyId, patch: { status } });
  }

  /** Updates the note draft. */
  onNoteInput(event: Event): void {
    this.noteDraft.set((event.target as HTMLTextAreaElement).value);
  }

  /** Saves the note draft if it changed, on blur. */
  saveNote(): void {
    const dependencyId = this.openDependencyId();
    const arrow = this.openArrow();
    if (dependencyId === null || !arrow) {
      return;
    }
    const trimmed = this.noteDraft().trim();
    if (trimmed !== (arrow.dependency.note ?? '')) {
      this.updateDependency.emit({ depId: dependencyId, patch: { note: trimmed || null } });
    }
  }

  /** Deletes the currently-open dependency. */
  deleteOpen(): void {
    const dependencyId = this.openDependencyId();
    if (dependencyId === null) {
      return;
    }
    this.deleteDependency.emit(dependencyId);
    this.openDependencyId.set(null);
  }

  private observeResize(wrapper: HTMLElement | null): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    // ResizeObserver is unavailable in some test/SSR environments — degrade to a
    // recompute-on-input-change-only behavior rather than throwing.
    if (!wrapper || typeof ResizeObserver === 'undefined') {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => this.recompute(wrapper));
    this.resizeObserver.observe(wrapper);
  }

  private recompute(wrapper: HTMLElement | null): void {
    if (!wrapper) {
      this.arrows.set([]);
      return;
    }
    const wrapperRect = wrapper.getBoundingClientRect();
    const next: Arrow[] = [];
    for (const dependency of this.dependencies()) {
      const fromEl = wrapper.querySelector<HTMLElement>(`[data-ticket-id="${dependency.fromTicketId}"]`);
      const toEl = wrapper.querySelector<HTMLElement>(`[data-ticket-id="${dependency.toTicketId}"]`);
      if (!fromEl || !toEl) {
        continue;
      }
      const from = fromEl.getBoundingClientRect();
      const to = toEl.getBoundingClientRect();
      const leftToRight = from.left + from.width / 2 <= to.left + to.width / 2;
      const x1 = (leftToRight ? from.right : from.left) - wrapperRect.left;
      const x2 = (leftToRight ? to.left : to.right) - wrapperRect.left;
      const y1 = from.top + from.height / 2 - wrapperRect.top;
      const y2 = to.top + to.height / 2 - wrapperRect.top;
      const dx = Math.max(Math.abs(x2 - x1) / 2, 40) * (leftToRight ? 1 : -1);
      next.push({
        dependency,
        path: `M${x1.toFixed(1)},${y1.toFixed(1)} C${(x1 + dx).toFixed(1)},${y1.toFixed(1)} ${(x2 - dx).toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`,
        midpoint: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
      });
    }
    this.arrows.set(next);
  }
}
