import { WritableSignal, signal } from '@angular/core';

/** The two authoritative fields every server-computed timer snapshot carries (US12.2.1 AC-S4). */
export interface MeetingTimerSnapshot {
  readonly elapsedSeconds: number;
  readonly remainingSeconds: number;
}

/** The local per-second display state derived from the latest {@link MeetingTimerSnapshot}. */
export interface MeetingTimerDisplayState {
  readonly elapsedSeconds: number;
  readonly remainingSeconds: number;
  readonly overtime: boolean;
  readonly overtimeSeconds: number;
}

const ZERO_STATE: MeetingTimerDisplayState = {
  elapsedSeconds: 0,
  remainingSeconds: 0,
  overtime: false,
  overtimeSeconds: 0,
};

/**
 * Anchors a per-second local render on the latest server-authoritative timer snapshot (US12.2.1
 * AC-02: "l'UI ancre son rendu par seconde sur la dernière valeur autoritative reçue, jamais sur
 * une horloge locale seule"). Every `TIMER_TICK` broadcast (or `GET .../live` response) re-anchors
 * the extrapolation; a single missed tick degrades gracefully — the display simply keeps
 * extrapolating from the previous anchor for one more second rather than freezing or erroring.
 *
 * `allottedSeconds` is derived per anchor as `elapsedSeconds + remainingSeconds` (always true by
 * construction server-side, even once `remainingSeconds` has gone negative in overtime) — no
 * separate "duration" field needs to travel over the wire for this to work.
 *
 * Not an Angular service (no DI, no `providedIn`) — instantiated per component that needs a
 * timer display, driven via {@link update}/{@link reset}, and torn down via {@link stop} from
 * that component's `ngOnDestroy` (the local `setInterval` would otherwise keep firing after the
 * component using it is gone).
 */
export class MeetingTimerDisplay {
  /** The current local display state, safe to bind directly in a template. */
  readonly state: WritableSignal<MeetingTimerDisplayState> = signal(ZERO_STATE);

  private allottedSeconds = 0;
  private anchor: MeetingTimerSnapshot | null = null;
  private anchorReceivedAtMs = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Feeds a fresh server-authoritative snapshot — from a `TIMER_TICK` broadcast, or the
   * `elapsedSeconds`/`remainingSeconds` of a `GET .../live` response / `MEETING_STARTED` event.
   */
  update(snapshot: MeetingTimerSnapshot): void {
    this.allottedSeconds = snapshot.elapsedSeconds + snapshot.remainingSeconds;
    this.anchor = snapshot;
    this.anchorReceivedAtMs = Date.now();
    this.render();
    this.ensureTicking();
  }

  /** Clears the local display and stops ticking — no current item (before start, or after end). */
  reset(): void {
    this.stop();
    this.anchor = null;
    this.state.set(ZERO_STATE);
  }

  /** Stops the local per-second interval without clearing the last rendered state. Idempotent. */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private ensureTicking(): void {
    if (this.intervalId !== null) {
      return;
    }
    this.intervalId = setInterval(() => this.render(), 1000);
  }

  private render(): void {
    if (!this.anchor) {
      return;
    }
    const secondsSinceAnchor = Math.floor((Date.now() - this.anchorReceivedAtMs) / 1000);
    const elapsedSeconds = this.anchor.elapsedSeconds + secondsSinceAnchor;
    const remainingSeconds = this.allottedSeconds - elapsedSeconds;
    const overtime = remainingSeconds < 0;
    this.state.set({
      elapsedSeconds,
      remainingSeconds,
      overtime,
      overtimeSeconds: overtime ? -remainingSeconds : 0,
    });
  }
}
