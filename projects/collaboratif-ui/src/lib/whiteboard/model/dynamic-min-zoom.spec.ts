import { describe, expect, it } from 'vitest';
import { computeMinZoom, type Rect } from './board-geometry';
import { FIT_PAD, MIN_ZOOM, MIN_ZOOM_HEADROOM } from './board-constants';

/**
 * US08.3.5 — dynamic zoom-out floor.
 *
 * The whole point of the feature is asymmetric: it may only ever *lower* the floor, never raise it.
 * Most tests below therefore assert against `MIN_ZOOM` as a ceiling rather than against a literal.
 */

/** A 1600×1000 surface leaves 1472×872 of usable space once {@link FIT_PAD} is removed twice. */
const VIEW_W = 1600;
const VIEW_H = 1000;
const AVAIL_W = VIEW_W - FIT_PAD * 2;
const AVAIL_H = VIEW_H - FIT_PAD * 2;

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

describe('computeMinZoom (US08.3.5)', () => {
  describe('ordinary boards — no regression', () => {
    it('keeps the fixed floor for a board that already fits', () => {
      // A single default-sized sticky: fitting it would need a zoom far above 1, so the computed
      // floor sits way above MIN_ZOOM and must not win.
      expect(computeMinZoom([rect(0, 0, 180, 140)], VIEW_W, VIEW_H)).toBe(MIN_ZOOM);
    });

    it('keeps the fixed floor for a board roughly the size of the viewport', () => {
      expect(computeMinZoom([rect(0, 0, VIEW_W, VIEW_H)], VIEW_W, VIEW_H)).toBe(MIN_ZOOM);
    });

    it('never returns a floor above the fixed one, whatever the content', () => {
      const boards: Rect[][] = [
        [rect(0, 0, 10, 10)],
        [rect(0, 0, 5000, 200)],
        [rect(-9000, -9000, 18000, 18000)],
        [rect(0, 0, 100, 100), rect(50000, 50000, 100, 100)],
      ];
      for (const content of boards) {
        expect(computeMinZoom(content, VIEW_W, VIEW_H)).toBeLessThanOrEqual(MIN_ZOOM);
      }
    });
  });

  describe('oversized boards — the floor extends', () => {
    it('lowers the floor once the content no longer fits at MIN_ZOOM', () => {
      // Width chosen so the exact fit is 0.05 — half the fixed floor.
      const width = AVAIL_W / 0.05;
      const floor = computeMinZoom([rect(0, 0, width, 100)], VIEW_W, VIEW_H);
      expect(floor).toBeCloseTo(0.05 * MIN_ZOOM_HEADROOM, 10);
      expect(floor).toBeLessThan(MIN_ZOOM);
    });

    it('leaves headroom below the bare fit, so the board can be seen whole', () => {
      const width = AVAIL_W / 0.05;
      const floor = computeMinZoom([rect(0, 0, width, 100)], VIEW_W, VIEW_H);
      // Strictly below the "just fits" zoom — otherwise the content would sit flush against the
      // viewport edges with nothing left to pull back by.
      expect(floor).toBeLessThan(0.05);
    });

    it('fits on the constraining axis (the taller of two dimensions wins)', () => {
      // Very tall, narrow content: the height, not the width, decides the fit.
      const height = AVAIL_H / 0.02;
      const floor = computeMinZoom([rect(0, 0, 100, height)], VIEW_W, VIEW_H);
      expect(floor).toBeCloseTo(0.02 * MIN_ZOOM_HEADROOM, 10);
    });

    it('accounts for the padding on both sides', () => {
      // If the padding were applied once instead of twice, the fit would come out larger and this
      // expectation would drift.
      const width = AVAIL_W / 0.04;
      expect(computeMinZoom([rect(0, 0, width, 10)], VIEW_W, VIEW_H)).toBeCloseTo(
        0.04 * MIN_ZOOM_HEADROOM,
        10,
      );
    });

    it('measures the union of every item, not just the largest one', () => {
      // Two small cards far apart span a huge box; taking each rect in isolation would miss it.
      const spread = AVAIL_W / 0.05;
      const floor = computeMinZoom([rect(0, 0, 100, 100), rect(spread - 100, 0, 100, 100)], VIEW_W, VIEW_H);
      expect(floor).toBeCloseTo(0.05 * MIN_ZOOM_HEADROOM, 10);
    });

    it('handles content at negative coordinates (boards extend past the origin)', () => {
      const half = AVAIL_W / 0.05 / 2;
      const floor = computeMinZoom([rect(-half, 0, half, 100), rect(0, 0, half, 100)], VIEW_W, VIEW_H);
      expect(floor).toBeCloseTo(0.05 * MIN_ZOOM_HEADROOM, 10);
    });
  });

  describe('degenerate input — never NaN, never zero, never negative', () => {
    it('falls back to the fixed floor on an empty board', () => {
      expect(computeMinZoom([], VIEW_W, VIEW_H)).toBe(MIN_ZOOM);
    });

    it('falls back when the content collapses to a point', () => {
      expect(computeMinZoom([rect(10, 10, 0, 0)], VIEW_W, VIEW_H)).toBe(MIN_ZOOM);
    });

    it('falls back when the content collapses to a line (zero height)', () => {
      expect(computeMinZoom([rect(0, 0, 500, 0)], VIEW_W, VIEW_H)).toBe(MIN_ZOOM);
    });

    it.each([
      ['unmeasured surface', 0, 0],
      ['surface narrower than its own padding', FIT_PAD, VIEW_H],
      ['surface exactly twice the padding', FIT_PAD * 2, FIT_PAD * 2],
      ['negative size (detached element)', -100, -100],
    ])('falls back for a %s', (_label, w, h) => {
      const floor = computeMinZoom([rect(0, 0, 100_000, 100_000)], w, h);
      expect(floor).toBe(MIN_ZOOM);
      expect(Number.isFinite(floor)).toBe(true);
      expect(floor).toBeGreaterThan(0);
    });

    it('stays finite and positive for absurdly large content', () => {
      const floor = computeMinZoom([rect(0, 0, Number.MAX_SAFE_INTEGER, 100)], VIEW_W, VIEW_H);
      expect(Number.isFinite(floor)).toBe(true);
      expect(floor).toBeGreaterThan(0);
    });

    it('falls back rather than propagating a NaN dimension', () => {
      expect(computeMinZoom([rect(0, 0, Number.NaN, 100)], VIEW_W, VIEW_H)).toBe(MIN_ZOOM);
    });
  });

  it('does not mutate the array it is given', () => {
    const content = [rect(0, 0, 100, 100), rect(500, 500, 100, 100)];
    const snapshot = JSON.parse(JSON.stringify(content));
    computeMinZoom(content, VIEW_W, VIEW_H);
    expect(content).toEqual(snapshot);
  });
});
