import { describe, expect, it } from 'vitest';
import { fitBox, wheelZoom, zoomAround, type Rect, type Viewport } from './board-geometry';
import {
  FIT_CONTENT_MAX_ZOOM,
  FIT_PAD,
  FIT_SELECTION_MAX_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  WHEEL_EXPONENT_LIMIT,
  WHEEL_ZOOM_BASE_FAST,
  WHEEL_ZOOM_BASE_SLOW,
  ZOOM_STEP,
} from './board-constants';

/** US08.11.2 — advanced zoom: framing, anchoring and wheel response. */

const VIEW_W = 1600;
const VIEW_H = 1000;
const AVAIL_W = VIEW_W - FIT_PAD * 2;
const AVAIL_H = VIEW_H - FIT_PAD * 2;

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

/** Where a canvas point lands on screen under a given viewport. */
function project(vp: Viewport, cx: number, cy: number): { x: number; y: number } {
  return { x: cx * vp.zoom + vp.x, y: cy * vp.zoom + vp.y };
}

describe('fitBox (US08.11.2)', () => {
  it('centres the box on both axes', () => {
    const box = rect(0, 0, 400, 300);
    const vp = fitBox(box, VIEW_W, VIEW_H, 10, MIN_ZOOM);
    expect(vp).not.toBeNull();
    const topLeft = project(vp!, box.x, box.y);
    const bottomRight = project(vp!, box.x + box.width, box.y + box.height);
    // Equal slack on the left and the right means the box is centred.
    expect(topLeft.x).toBeCloseTo(VIEW_W - bottomRight.x, 6);
    expect(topLeft.y).toBeCloseTo(VIEW_H - bottomRight.y, 6);
  });

  it('centres a box that does not start at the origin', () => {
    const box = rect(-500, 2000, 400, 300);
    const vp = fitBox(box, VIEW_W, VIEW_H, 10, MIN_ZOOM)!;
    const topLeft = project(vp, box.x, box.y);
    const bottomRight = project(vp, box.x + box.width, box.y + box.height);
    expect(topLeft.x).toBeCloseTo(VIEW_W - bottomRight.x, 6);
    expect(topLeft.y).toBeCloseTo(VIEW_H - bottomRight.y, 6);
  });

  it('fits on the constraining axis and leaves the padding intact', () => {
    // Wide, short box: the width decides the zoom, so the padding shows on the left/right.
    const box = rect(0, 0, AVAIL_W * 2, 10);
    const vp = fitBox(box, VIEW_W, VIEW_H, 10, MIN_ZOOM)!;
    expect(vp.zoom).toBeCloseTo(0.5, 10);
    expect(project(vp, box.x, box.y).x).toBeCloseTo(FIT_PAD, 6);
  });

  it('fits on the vertical axis when the height is the constraint', () => {
    const box = rect(0, 0, 10, AVAIL_H * 4);
    const vp = fitBox(box, VIEW_W, VIEW_H, 10, MIN_ZOOM)!;
    expect(vp.zoom).toBeCloseTo(0.25, 10);
    expect(project(vp, box.x, box.y).y).toBeCloseTo(FIT_PAD, 6);
  });

  describe('zoom ceilings', () => {
    it('never magnifies past 100 % when fitting content', () => {
      // A tiny box would otherwise fit at a huge zoom.
      const vp = fitBox(rect(0, 0, 20, 20), VIEW_W, VIEW_H, FIT_CONTENT_MAX_ZOOM, MIN_ZOOM)!;
      expect(vp.zoom).toBe(FIT_CONTENT_MAX_ZOOM);
    });

    it('magnifies up to 150 % when fitting a selection', () => {
      const vp = fitBox(rect(0, 0, 20, 20), VIEW_W, VIEW_H, FIT_SELECTION_MAX_ZOOM, MIN_ZOOM)!;
      expect(vp.zoom).toBe(FIT_SELECTION_MAX_ZOOM);
      expect(vp.zoom).toBeGreaterThan(1);
    });

    it('still centres a box that hit the ceiling', () => {
      const box = rect(0, 0, 20, 20);
      const vp = fitBox(box, VIEW_W, VIEW_H, FIT_SELECTION_MAX_ZOOM, MIN_ZOOM)!;
      const topLeft = project(vp, box.x, box.y);
      const bottomRight = project(vp, box.x + box.width, box.y + box.height);
      expect(topLeft.x).toBeCloseTo(VIEW_W - bottomRight.x, 6);
    });

    it('never exceeds MAX_ZOOM even when the caller asks for more', () => {
      const vp = fitBox(rect(0, 0, 1, 1), VIEW_W, VIEW_H, 99, MIN_ZOOM)!;
      expect(vp.zoom).toBe(MAX_ZOOM);
    });
  });

  describe('zoom floor', () => {
    it('clamps up to the given floor for content too large to fit', () => {
      const vp = fitBox(rect(0, 0, 1e7, 1e7), VIEW_W, VIEW_H, FIT_CONTENT_MAX_ZOOM, MIN_ZOOM)!;
      expect(vp.zoom).toBe(MIN_ZOOM);
    });

    it('honours a dynamic floor below MIN_ZOOM (US08.3.5)', () => {
      const dynamicFloor = 0.02;
      const vp = fitBox(rect(0, 0, 1e7, 1e7), VIEW_W, VIEW_H, FIT_CONTENT_MAX_ZOOM, dynamicFloor)!;
      expect(vp.zoom).toBe(dynamicFloor);
    });
  });

  describe('degenerate input — null means "do nothing"', () => {
    it.each([
      ['zero width', rect(0, 0, 0, 100)],
      ['zero height', rect(0, 0, 100, 0)],
      ['a point', rect(5, 5, 0, 0)],
      ['negative width', rect(0, 0, -100, 100)],
      ['NaN width', rect(0, 0, Number.NaN, 100)],
    ])('returns null for %s', (_label, box) => {
      expect(fitBox(box, VIEW_W, VIEW_H, 1, MIN_ZOOM)).toBeNull();
    });

    it.each([
      ['an unmeasured surface', 0, 0],
      ['a surface smaller than its padding', FIT_PAD, FIT_PAD],
      ['a surface exactly twice the padding', FIT_PAD * 2, FIT_PAD * 2],
    ])('returns null for %s', (_label, w, h) => {
      expect(fitBox(rect(0, 0, 100, 100), w, h, 1, MIN_ZOOM)).toBeNull();
    });
  });
});

describe('zoomAround (US08.11.2)', () => {
  const vp: Viewport = { x: 120, y: -40, zoom: 0.8 };

  it('keeps the anchor point pinned to the same screen position', () => {
    const anchorX = 700;
    const anchorY = 300;
    // The canvas point currently under the anchor…
    const canvasX = (anchorX - vp.x) / vp.zoom;
    const canvasY = (anchorY - vp.y) / vp.zoom;

    const next = zoomAround(vp, 2.4, anchorX, anchorY);
    const after = project(next, canvasX, canvasY);

    // …must still be under it afterwards. This is the whole contract of the function.
    expect(after.x).toBeCloseTo(anchorX, 6);
    expect(after.y).toBeCloseTo(anchorY, 6);
  });

  it('pins the anchor when zooming out too', () => {
    const anchorX = 200;
    const anchorY = 900;
    const canvasX = (anchorX - vp.x) / vp.zoom;
    const canvasY = (anchorY - vp.y) / vp.zoom;

    const after = project(zoomAround(vp, 0.2, anchorX, anchorY), canvasX, canvasY);
    expect(after.x).toBeCloseTo(anchorX, 6);
    expect(after.y).toBeCloseTo(anchorY, 6);
  });

  it('applies the requested zoom verbatim — clamping is the caller’s job', () => {
    expect(zoomAround(vp, 2.4, 0, 0).zoom).toBe(2.4);
  });

  it('is a no-op when the zoom is unchanged', () => {
    expect(zoomAround(vp, vp.zoom, 640, 480)).toEqual(vp);
  });

  it('centre-anchoring keeps the middle of the surface stable (buttons, reset)', () => {
    const cx = VIEW_W / 2;
    const cy = VIEW_H / 2;
    const canvasX = (cx - vp.x) / vp.zoom;
    const canvasY = (cy - vp.y) / vp.zoom;

    const after = project(zoomAround(vp, vp.zoom * ZOOM_STEP, cx, cy), canvasX, canvasY);
    expect(after.x).toBeCloseTo(cx, 6);
    expect(after.y).toBeCloseTo(cy, 6);
  });
});

describe('wheelZoom (US08.11.2)', () => {
  it('zooms in on a negative deltaY and out on a positive one', () => {
    expect(wheelZoom(1, -100, false)).toBeGreaterThan(1);
    expect(wheelZoom(1, 100, false)).toBeLessThan(1);
  });

  it('moves an order of magnitude faster with Ctrl/Cmd held', () => {
    const slow = wheelZoom(1, -100, false);
    const fast = wheelZoom(1, -100, true);
    expect(fast).toBeGreaterThan(slow);
    // The bases differ by 12.5×, so the exponents do too.
    expect(Math.log(fast) / Math.log(slow)).toBeCloseTo(WHEEL_ZOOM_BASE_FAST / WHEEL_ZOOM_BASE_SLOW, 6);
  });

  it('is exponential below 1× — equal deltas compose multiplicatively', () => {
    // Two 50px steps equal one 100px step, which is what makes the perceived speed uniform,
    // unlike a fixed additive or fixed-factor step. Stated below 1× on purpose: the damping
    // above 1× deliberately breaks this (see the damping tests below).
    const oneStep = wheelZoom(0.4, -100, false);
    const twoSteps = wheelZoom(wheelZoom(0.4, -50, false), -50, false);
    expect(twoSteps).toBeCloseTo(oneStep, 10);
    expect(twoSteps).toBeLessThan(1);
  });

  it('is symmetric below 1× — in then out by the same delta returns to the start', () => {
    const there = wheelZoom(0.4, -120, false);
    expect(wheelZoom(there, 120, false)).toBeCloseTo(0.4, 10);
  });

  it('is deliberately asymmetric across 1×, because of the damping', () => {
    // Zooming in past 1× then back out by the same delta does NOT return to the start: the
    // outbound step is damped by the higher zoom it starts from. This is a consequence of the
    // spec's `1/sqrt(zoom)` damping, not a rounding artefact — pinned so nobody "fixes" it.
    const there = wheelZoom(1, -120, false);
    expect(there).toBeGreaterThan(1);
    expect(wheelZoom(there, 120, false)).toBeGreaterThan(1);
  });

  it('does not damp at or below 1×', () => {
    // damp = 1 below 1, so the raw exponential applies.
    expect(wheelZoom(1, -100, false)).toBeCloseTo(Math.exp(100 * WHEEL_ZOOM_BASE_SLOW), 10);
    expect(wheelZoom(0.5, -100, false)).toBeCloseTo(0.5 * Math.exp(100 * WHEEL_ZOOM_BASE_SLOW), 10);
  });

  it('damps above 1× so the gesture stays usable when magnified', () => {
    // At 4×, damp = 1/2: the relative step is half what it is at 1×.
    const relativeAtOne = wheelZoom(1, -100, false) / 1;
    const relativeAtFour = wheelZoom(4, -100, false) / 4;
    expect(relativeAtFour).toBeLessThan(relativeAtOne);
    expect(Math.log(relativeAtFour)).toBeCloseTo(Math.log(relativeAtOne) / 2, 10);
  });

  describe('pathological deltas', () => {
    /**
     * A `DOM_DELTA_PAGE` event, a coarse driver or a synthetic event can carry a delta orders of
     * magnitude above the usual ±100. Unbounded, the exponent underflows: `exp(-1000)` is exactly
     * 0, and a zoom of zero collapses the layer's `scale()`, making the entire board vanish.
     */
    it.each([1e5, 1e9, Number.MAX_SAFE_INTEGER])(
      'never underflows to zero for a delta of %p',
      delta => {
        const z = wheelZoom(1, delta, true);
        expect(z).toBeGreaterThan(0);
        expect(Number.isFinite(z)).toBe(true);
      },
    );

    it('never overflows to Infinity for a huge negative delta', () => {
      const z = wheelZoom(1, -1e9, true);
      expect(Number.isFinite(z)).toBe(true);
    });

    it('caps a single event at the exponent limit in each direction', () => {
      expect(wheelZoom(1, -1e9, true)).toBeCloseTo(Math.exp(WHEEL_EXPONENT_LIMIT), 0);
      expect(wheelZoom(1, 1e9, true)).toBeCloseTo(Math.exp(-WHEEL_EXPONENT_LIMIT), 10);
    });

    it('leaves ordinary deltas well inside the cap', () => {
      // A normal wheel notch must be nowhere near the clamp, or the clamp would flatten real use.
      // This is exactly what an earlier, tighter limit of 1 got wrong: a Ctrl+wheel notch lands on
      // an exponent of ~1 and was being silently truncated.
      const ratio = wheelZoom(1, -100, true) / 1;
      expect(ratio).toBeLessThan(Math.exp(WHEEL_EXPONENT_LIMIT));
      expect(ratio).toBeCloseTo(Math.exp(100 * WHEEL_ZOOM_BASE_FAST), 10);
    });
  });

  it('leaves the zoom untouched for a zero delta', () => {
    expect(wheelZoom(0.73, 0, false)).toBeCloseTo(0.73, 10);
  });
});

describe('zoom step constant', () => {
  it('is the 1.25 factor the spec pins', () => {
    expect(ZOOM_STEP).toBe(1.25);
  });

  it('round-trips: one step in then one step out returns to the start', () => {
    expect(1 * ZOOM_STEP * (1 / ZOOM_STEP)).toBeCloseTo(1, 10);
  });
});
