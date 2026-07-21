import { describe, expect, it } from 'vitest';

import {
  AXIS_LOCK_DASH_PX,
  AXIS_LOCK_HYSTERESIS_PX,
  AXIS_LOCK_THRESHOLD_PX,
  type AxisLock,
  axisLockDash,
  constrainToAxis,
  decideFreeAxis,
} from './axis-lock';

/** A settled lock, free to move along `axis`, captured with the card at (500, 300). */
const lockOn = (freeAxis: 'x' | 'y' | null): AxisLock => ({
  cardPos: { x: 500, y: 300 },
  pointerOrig: { x: 0, y: 0 },
  freeAxis,
});

describe('decideFreeAxis — dead zone', () => {
  it('stays undecided while the pointer has not travelled the threshold', () => {
    // 7 canvas px at zoom 1 is 7 screen px — under the 8 px threshold, so the drag stays free.
    expect(decideFreeAxis(null, 7, 0, 1)).toBeNull();
  });

  it('decides exactly at the threshold', () => {
    // Boundary is inclusive on the "decide" side: `max < threshold` keeps waiting, so 8 decides.
    expect(decideFreeAxis(null, AXIS_LOCK_THRESHOLD_PX, 0, 1)).toBe('x');
  });

  it('keeps an already-decided axis while the pointer returns inside the dead zone', () => {
    // Coming back near the capture point must not un-decide — the user would see the card break
    // free mid-gesture for no reason.
    expect(decideFreeAxis('y', 1, 1, 1)).toBe('y');
  });

  it('leaves the drag free when Shift is pressed but the pointer never moves', () => {
    expect(decideFreeAxis(null, 0, 0, 1)).toBeNull();
  });
});

describe('decideFreeAxis — dominance', () => {
  it('frees the horizontal axis on a horizontal travel', () => {
    expect(decideFreeAxis(null, 50, 5, 1)).toBe('x');
  });

  it('frees the vertical axis on a vertical travel', () => {
    expect(decideFreeAxis(null, 5, 50, 1)).toBe('y');
  });

  it('breaks an exact tie towards the horizontal', () => {
    expect(decideFreeAxis(null, 30, 30, 1)).toBe('x');
  });
});

describe('decideFreeAxis — hysteresis', () => {
  it('does not flip while the challenger only just leads', () => {
    // 30 vs 25: vertical leads, but by less than the 12px margin, so the horizontal choice holds.
    // This is the anti-flicker guarantee — without it the axis oscillates along the diagonal.
    expect(decideFreeAxis('x', 25, 30, 1)).toBe('x');
  });

  it('does not flip exactly at the hysteresis margin', () => {
    // Strictly greater than, so leading by exactly 12 is not enough.
    expect(decideFreeAxis('x', 20, 20 + AXIS_LOCK_HYSTERESIS_PX, 1)).toBe('x');
  });

  it('flips once the challenger clearly leads', () => {
    expect(decideFreeAxis('x', 20, 40, 1)).toBe('y');
  });

  it('flips symmetrically from vertical to horizontal', () => {
    expect(decideFreeAxis('y', 40, 20, 1)).toBe('x');
  });

  it('stays escapable after a long run along the free axis', () => {
    // The reason the margin is absolute rather than a ratio: deltas are measured from the capture
    // and grow without bound. A x1.5 rule would demand 600px here, trapping the user on the axis
    // for the rest of the gesture — on a long column run, the very case this feature exists for.
    expect(decideFreeAxis('x', 400, 413, 1)).toBe('y');
  });

  it('scales the margin with zoom', () => {
    // At 4x, the 12px screen margin is only 3 canvas px.
    expect(decideFreeAxis('x', 100, 102, 4)).toBe('x');
    expect(decideFreeAxis('x', 100, 104, 4)).toBe('y');
  });
});

describe('decideFreeAxis — zoom is expressed in screen pixels', () => {
  it('needs more canvas travel when zoomed out', () => {
    // At 0.5x, 8 screen px is 16 canvas px — 10 is not enough yet.
    expect(decideFreeAxis(null, 10, 0, 0.5)).toBeNull();
    expect(decideFreeAxis(null, 16, 0, 0.5)).toBe('x');
  });

  it('needs less canvas travel when zoomed in', () => {
    // At 4x, 8 screen px is only 2 canvas px.
    expect(decideFreeAxis(null, 2, 0, 4)).toBe('x');
  });
});

describe('decideFreeAxis — degenerate input', () => {
  it.each([0, -1, NaN, Infinity])('keeps the current decision at zoom %s', (zoom) => {
    expect(decideFreeAxis('x', 100, 0, zoom)).toBe('x');
    expect(decideFreeAxis(null, 100, 0, zoom)).toBeNull();
  });

  it.each([NaN, Infinity])('keeps the current decision on a non-finite delta (%s)', (bad) => {
    expect(decideFreeAxis('y', bad, 10, 1)).toBe('y');
    expect(decideFreeAxis('y', 10, bad, 1)).toBe('y');
  });
});

describe('constrainToAxis', () => {
  it('passes the position through when there is no lock', () => {
    expect(constrainToAxis(null, { x: 123, y: 456 })).toEqual({ x: 123, y: 456 });
  });

  it('passes the position through while the axis is undecided', () => {
    // Shift held but inside the dead zone: the card must still follow the pointer freely.
    expect(constrainToAxis(lockOn(null), { x: 123, y: 456 })).toEqual({ x: 123, y: 456 });
  });

  it('pins Y when the horizontal axis is free', () => {
    expect(constrainToAxis(lockOn('x'), { x: 123, y: 456 })).toEqual({ x: 123, y: 300 });
  });

  it('pins X when the vertical axis is free', () => {
    expect(constrainToAxis(lockOn('y'), { x: 123, y: 456 })).toEqual({ x: 500, y: 456 });
  });

  it('holds the captured coordinate however far the pointer strays', () => {
    // The whole point of the feature: 4000 px away on the locked axis changes nothing.
    expect(constrainToAxis(lockOn('y'), { x: 4500, y: 900 })).toEqual({ x: 500, y: 900 });
  });

  it('is idempotent', () => {
    const once = constrainToAxis(lockOn('y'), { x: 123, y: 456 });
    expect(constrainToAxis(lockOn('y'), once)).toEqual(once);
  });
});

describe('axisLockDash', () => {
  it('builds a repeating gradient in the requested direction', () => {
    expect(axisLockDash('to bottom', '#ec4899', 1)).toBe(
      `repeating-linear-gradient(to bottom, #ec4899 0 ${AXIS_LOCK_DASH_PX}px, transparent ${AXIS_LOCK_DASH_PX}px ${AXIS_LOCK_DASH_PX * 2}px)`,
    );
  });

  it('shortens the dash as the zoom grows so it stays 4 screen px', () => {
    // The canvas layer scales the value back up by `zoom`; a fixed canvas length would stretch
    // into a solid bar when zoomed in, which is exactly what must not happen.
    expect(axisLockDash('to right', '#ec4899', 4)).toContain('0 1px');
  });

  it.each([0, -1, NaN, Infinity])('falls back to zoom 1 on a degenerate zoom (%s)', (zoom) => {
    expect(axisLockDash('to right', '#ec4899', zoom)).toContain(`0 ${AXIS_LOCK_DASH_PX}px`);
  });
});
