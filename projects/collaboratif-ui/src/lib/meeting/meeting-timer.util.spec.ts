import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MeetingTimerDisplay } from './meeting-timer.util';

describe('MeetingTimerDisplay', () => {
  let timer: MeetingTimerDisplay;

  beforeEach(() => {
    vi.useFakeTimers();
    timer = new MeetingTimerDisplay();
  });

  afterEach(() => {
    timer.stop();
    vi.useRealTimers();
  });

  it('starts at the zero state before any update()', () => {
    expect(timer.state()).toEqual({ elapsedSeconds: 0, remainingSeconds: 0, overtime: false, overtimeSeconds: 0 });
  });

  it('renders the fed snapshot immediately on update()', () => {
    timer.update({ elapsedSeconds: 30, remainingSeconds: 270 });
    expect(timer.state()).toEqual({
      elapsedSeconds: 30,
      remainingSeconds: 270,
      overtime: false,
      overtimeSeconds: 0,
    });
  });

  it('extrapolates elapsed/remaining by one second per local tick between authoritative updates', () => {
    timer.update({ elapsedSeconds: 30, remainingSeconds: 270 });

    vi.advanceTimersByTime(1000);
    expect(timer.state().elapsedSeconds).toBe(31);
    expect(timer.state().remainingSeconds).toBe(269);

    vi.advanceTimersByTime(1000);
    expect(timer.state().elapsedSeconds).toBe(32);
    expect(timer.state().remainingSeconds).toBe(268);
  });

  it('transitions into overtime once the local extrapolation crosses the allotted duration', () => {
    // allotted = 5 + 2 = 7s; after 3 more local ticks, elapsed=8 > allotted=7 -> overtime.
    timer.update({ elapsedSeconds: 5, remainingSeconds: 2 });

    vi.advanceTimersByTime(3000);

    expect(timer.state().overtime).toBe(true);
    expect(timer.state().remainingSeconds).toBe(-1);
    expect(timer.state().overtimeSeconds).toBe(1);
  });

  it('re-anchors on every update(), discarding the previous extrapolation trajectory', () => {
    timer.update({ elapsedSeconds: 100, remainingSeconds: -10 }); // overtime from a prior item
    expect(timer.state().overtime).toBe(true);

    // A fresh TIMER_TICK for a NEW current item (elapsed reset to near-zero) must immediately
    // reflect the new item's state, not keep extrapolating the old one.
    timer.update({ elapsedSeconds: 0, remainingSeconds: 300 });
    expect(timer.state()).toEqual({
      elapsedSeconds: 0,
      remainingSeconds: 300,
      overtime: false,
      overtimeSeconds: 0,
    });
  });

  it('a single missed tick degrades gracefully: local extrapolation keeps advancing regardless', () => {
    timer.update({ elapsedSeconds: 10, remainingSeconds: 290 });

    // Simulate 3 seconds passing with no fresh update() call (a missed/delayed TIMER_TICK).
    vi.advanceTimersByTime(3000);

    expect(timer.state().elapsedSeconds).toBe(13);
  });

  it('reset() clears the display and stops the local interval', () => {
    timer.update({ elapsedSeconds: 10, remainingSeconds: 290 });
    timer.reset();

    expect(timer.state()).toEqual({ elapsedSeconds: 0, remainingSeconds: 0, overtime: false, overtimeSeconds: 0 });

    vi.advanceTimersByTime(5000);
    expect(timer.state()).toEqual({ elapsedSeconds: 0, remainingSeconds: 0, overtime: false, overtimeSeconds: 0 });
  });

  it('stop() halts local ticking without clearing the last rendered state', () => {
    timer.update({ elapsedSeconds: 10, remainingSeconds: 290 });
    timer.stop();

    vi.advanceTimersByTime(5000);

    expect(timer.state().elapsedSeconds).toBe(10);
  });

  it('update() after stop() resumes local ticking', () => {
    timer.update({ elapsedSeconds: 10, remainingSeconds: 290 });
    timer.stop();

    timer.update({ elapsedSeconds: 20, remainingSeconds: 280 });
    vi.advanceTimersByTime(1000);

    expect(timer.state().elapsedSeconds).toBe(21);
  });
});
