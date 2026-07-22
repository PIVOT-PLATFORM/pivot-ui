import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/** SVG circle radius, in user units — matches the reference POC's `CircleTimer` proportions. */
const RADIUS = 72;

/** Full SVG circumference for {@link RADIUS}, used to derive `stroke-dasharray`/`-dashoffset`. */
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Circular countdown timer for the current speaker of a running standup session (US10.2.1).
 *
 * Purely presentational and **entirely client-derived**: the remaining time is recomputed every
 * second from `speakingAt` + `Date.now()` via a local `setInterval` tick signal — never a value
 * pushed by the server (see US10.1.1's "Architecture temps réel" AC). Modeled on the reference
 * POC PouetPouet's `CircleTimer` component (`apps/web/src/app/(app)/daily/[id]/page.tsx`):
 * `radius = 72`, `stroke-dasharray`/`-dashoffset` driven by the elapsed/total ratio, rotated -90°
 * so the stroke starts at 12 o'clock. Restyled with `@pivot/design-system` tokens instead of the
 * POC's hardcoded hex values.
 *
 * Once the elapsed time exceeds `timePerPersonSeconds + extraSeconds`, the ring locks at full
 * (`stroke-dashoffset: 0`) and switches to the "overdue" visual (alert color, negative countdown)
 * rather than blocking or resetting — the actual auto-advance is a separate server-side event
 * (`StandupTimerScheduler`, US10.2.1) this component has no visibility into.
 */
@Component({
  selector: 'app-standup-timer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './standup-timer.component.html',
  styleUrl: './standup-timer.component.scss',
})
export class StandupTimerComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  /** ISO timestamp the current speaker started, or `null` if nobody is currently speaking. */
  readonly speakingAt = input<string | null>(null);

  /** Configured speaking time per participant, in seconds. */
  readonly timePerPersonSeconds = input.required<number>();

  /** Cumulative extra seconds granted via `extend` (US10.2.2) — added to the base duration. */
  readonly extraSeconds = input(0);

  /** Forces a recompute every second — its value is never read, only its change matters. */
  private readonly tick = signal(0);

  /** Total allotted duration for the current speaker, in seconds. */
  private readonly totalSeconds = computed(() => this.timePerPersonSeconds() + this.extraSeconds());

  /** Elapsed seconds since `speakingAt`, recomputed every {@link tick}. */
  private readonly elapsedSeconds = computed(() => {
    this.tick();
    const startedAt = this.speakingAt();
    if (!startedAt) {
      return 0;
    }
    return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  });

  /** `true` once elapsed time exceeds the allotted total — the "overdue" visual state. */
  readonly isOverdue = computed(() => this.elapsedSeconds() > this.totalSeconds());

  /** Seconds remaining (negative once overdue) — the value rendered in the center of the ring. */
  readonly remainingSeconds = computed(() => this.totalSeconds() - this.elapsedSeconds());

  /** Formatted `MM:SS` (or `-MM:SS` once overdue) remaining-time label. */
  readonly formattedRemaining = computed(() => formatSignedTime(this.remainingSeconds()));

  /** SVG circle radius, exposed for the template. */
  protected readonly radius = RADIUS;

  /** Full circumference, exposed for the template's `stroke-dasharray`. */
  protected readonly circumference = CIRCUMFERENCE;

  /** `stroke-dashoffset` for the progress ring — `0` (full ring) once overdue, never negative. */
  readonly dashOffset = computed(() => {
    const progress = Math.min(this.elapsedSeconds() / this.totalSeconds(), 1);
    return CIRCUMFERENCE * (1 - progress);
  });

  /** Starts the 1s local recompute tick, cleaned up automatically on destroy. */
  ngOnInit(): void {
    const intervalId = setInterval(() => this.tick.update(t => t + 1), 1000);
    this.destroyRef.onDestroy(() => clearInterval(intervalId));
  }
}

/**
 * Formats a signed seconds count as `MM:SS` (positive) or `-MM:SS` (negative), always
 * zero-padded, e.g. `125` → `"02:05"`, `-7` → `"-00:07"`.
 *
 * @param totalSeconds the signed seconds count
 * @returns the formatted `[-]MM:SS` string
 */
function formatSignedTime(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? '-' : '';
  const abs = Math.abs(totalSeconds);
  const minutes = Math.floor(abs / 60);
  const seconds = abs % 60;
  return `${sign}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
