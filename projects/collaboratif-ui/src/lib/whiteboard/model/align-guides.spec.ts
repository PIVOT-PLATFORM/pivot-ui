import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  ALIGN_GUIDE_COLOR,
  ALIGN_GUIDE_Z_INDEX,
  ALIGN_SNAP_PX,
  ALIGN_STORAGE_KEY,
  computeAlignGuides,
  readAlignPreference,
  writeAlignPreference,
  type AlignBox,
} from './board-constants';

/**
 * US08.11.4 — alignment guides: the landmark/tolerance contract and the browser-local toggle.
 *
 * The dragged card is 100×100 throughout, so its landmarks sit at `x`, `x + 50`, `x + 100` — the
 * arithmetic below is deliberately easy to check by hand.
 */
const MOVING = { id: 'self', width: 100, height: 100 };

function box(over: Partial<AlignBox> = {}): AlignBox {
  return { id: 'other', type: 'STICKY', posX: 0, posY: 0, width: 100, height: 100, ...over };
}

describe('alignment guides (US08.11.4)', () => {
  describe('computeAlignGuides', () => {
    it('uses a 6 screen-px tolerance', () => {
      expect(ALIGN_SNAP_PX).toBe(6);
    });

    it('matches a left edge within tolerance and snaps onto it', () => {
      // Self left edge at 204, target left edge at 200 → 4 px apart, inside the 6 px tolerance.
      const r = computeAlignGuides({ ...MOVING, x: 204, y: 999 }, [box({ posX: 200, posY: 999 })], 1);
      expect(r.v).toBe(200);
      expect(r.dx).toBe(-4);
    });

    it('ignores a candidate beyond tolerance', () => {
      const r = computeAlignGuides({ ...MOVING, x: 207, y: 5000 }, [box({ posX: 200 })], 1);
      expect(r.v).toBeNull();
      expect(r.dx).toBe(0);
    });

    it('matches on the exact tolerance boundary (<=, not <)', () => {
      const r = computeAlignGuides({ ...MOVING, x: 206, y: 5000 }, [box({ posX: 200 })], 1);
      expect(r.v).toBe(200);
    });

    it('aligns centres, not just edges', () => {
      // A wide target whose *centre* is the only landmark in range: self centre 350, target centre
      // 252 + 100 = 352 (distance 2), while its edges sit 202 and 102 px away.
      const r = computeAlignGuides({ ...MOVING, x: 300, y: 5000 }, [box({ posX: 252, width: 200 })], 1);
      expect(r.v).toBe(352);
      expect(r.dx).toBe(2);
    });

    it('aligns right edge to right edge', () => {
      // A wide target whose *right* edge is the only landmark in range: self right 600, target
      // right 298 + 300 = 598 (distance 2), while its left (298) and centre (448) are far off.
      const r = computeAlignGuides({ ...MOVING, x: 500, y: 5000 }, [box({ posX: 298, width: 300 })], 1);
      expect(r.v).toBe(598);
      expect(r.dx).toBe(-2);
    });

    it('produces guides on both axes at once', () => {
      const r = computeAlignGuides({ ...MOVING, x: 202, y: 302 }, [box({ posX: 200, posY: 300 })], 1);
      expect(r.v).toBe(200);
      expect(r.h).toBe(300);
      expect(r.dx).toBe(-2);
      expect(r.dy).toBe(-2);
    });

    it('keeps only the closest candidate per axis — at most one line each', () => {
      const r = computeAlignGuides({ ...MOVING, x: 205, y: 5000 }, [
        box({ id: 'far', posX: 200 }), // distance 5
        box({ id: 'near', posX: 203 }), // distance 2 — wins
      ], 1);
      expect(r.v).toBe(203);
      expect(r.dx).toBe(-2);
    });

    it('never targets the dragged card itself', () => {
      // A card compared against itself is a perfect match on every landmark; excluding it is what
      // stops the guides from firing permanently on any drag.
      const r = computeAlignGuides({ ...MOVING, x: 200, y: 200 }, [
        box({ id: 'self', posX: 200, posY: 200 }),
      ], 1);
      expect(r.v).toBeNull();
      expect(r.h).toBeNull();
    });

    it('excludes DRAW cards as targets', () => {
      const r = computeAlignGuides({ ...MOVING, x: 202, y: 5000 }, [
        box({ id: 'stroke', type: 'DRAW', posX: 200 }),
      ], 1);
      expect(r.v).toBeNull();
    });

    it('still matches non-DRAW cards when a DRAW card is also nearby', () => {
      const r = computeAlignGuides({ ...MOVING, x: 202, y: 5000 }, [
        box({ id: 'stroke', type: 'DRAW', posX: 201 }), // closer, but must be skipped
        box({ id: 'sticky', type: 'STICKY', posX: 200 }),
      ], 1);
      expect(r.v).toBe(200);
    });

    describe('zoom conversion', () => {
      it('shrinks the canvas tolerance when zoomed in', () => {
        // At 3x, 6 screen px = 2 canvas px: a 4 px canvas gap is no longer reachable.
        const r = computeAlignGuides({ ...MOVING, x: 204, y: 5000 }, [box({ posX: 200 })], 3);
        expect(r.v).toBeNull();
      });

      it('widens the canvas tolerance when zoomed out', () => {
        // At 0.5x, 6 screen px = 12 canvas px: a 10 px canvas gap now matches.
        const r = computeAlignGuides({ ...MOVING, x: 210, y: 5000 }, [box({ posX: 200 })], 0.5);
        expect(r.v).toBe(200);
        expect(r.dx).toBe(-10);
      });
    });

    describe('degenerate input', () => {
      it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
        'yields no guides for the zoom %p rather than dividing by zero',
        zoom => {
          const r = computeAlignGuides({ ...MOVING, x: 200, y: 200 }, [box({ posX: 200, posY: 200 })], zoom);
          expect(r).toEqual({ v: null, h: null, dx: 0, dy: 0 });
        },
      );

      it('yields no guides on an empty board', () => {
        expect(computeAlignGuides({ ...MOVING, x: 0, y: 0 }, [], 1)).toEqual({
          v: null,
          h: null,
          dx: 0,
          dy: 0,
        });
      });

      it('yields no guides when every other card is a DRAW stroke', () => {
        const r = computeAlignGuides({ ...MOVING, x: 200, y: 200 }, [
          box({ id: 'a', type: 'DRAW', posX: 200, posY: 200 }),
          box({ id: 'b', type: 'DRAW', posX: 201, posY: 201 }),
        ], 1);
        expect(r.v).toBeNull();
        expect(r.h).toBeNull();
      });
    });

    it('is idempotent — re-probing an already-snapped position keeps it put', () => {
      const first = computeAlignGuides({ ...MOVING, x: 204, y: 5000 }, [box({ posX: 200 })], 1);
      const settled = 204 + first.dx;
      const second = computeAlignGuides({ ...MOVING, x: settled, y: 5000 }, [box({ posX: 200 })], 1);
      expect(second.dx).toBe(0);
      expect(second.v).toBe(200);
    });
  });

  describe('rendering constants', () => {
    it('pins the spec §4.3/§7 values', () => {
      expect(ALIGN_GUIDE_COLOR).toBe('#ec4899');
      expect(ALIGN_GUIDE_Z_INDEX).toBe(60);
    });
  });

  describe('persistence', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      localStorage.clear();
    });

    it('defaults to ON when the key is absent — the mirror image of the grid preference', () => {
      expect(readAlignPreference()).toBe(true);
    });

    it("treats only the exact string '0' as disabled", () => {
      localStorage.setItem(ALIGN_STORAGE_KEY, '0');
      expect(readAlignPreference()).toBe(false);

      localStorage.setItem(ALIGN_STORAGE_KEY, '1');
      expect(readAlignPreference()).toBe(true);
    });

    it.each(['', 'false', 'no', '00', '{"a":1}', '<script>alert(1)</script>'])(
      'falls back to ON for the corrupted value %j, without throwing',
      value => {
        localStorage.setItem(ALIGN_STORAGE_KEY, value);
        expect(() => readAlignPreference()).not.toThrow();
        expect(readAlignPreference()).toBe(true);
      },
    );

    it("writes '1'/'0' under the spec's key", () => {
      writeAlignPreference(false);
      expect(localStorage.getItem(ALIGN_STORAGE_KEY)).toBe('0');

      writeAlignPreference(true);
      expect(localStorage.getItem(ALIGN_STORAGE_KEY)).toBe('1');
    });

    it('round-trips through storage', () => {
      writeAlignPreference(false);
      expect(readAlignPreference()).toBe(false);
    });

    it('does not collide with the grid preference key', () => {
      expect(ALIGN_STORAGE_KEY).toBe('klx_board_align');
    });

    it('survives a storage that throws (private browsing, quota exceeded)', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('denied');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('quota');
      });

      expect(() => readAlignPreference()).not.toThrow();
      expect(readAlignPreference()).toBe(true);
      expect(() => writeAlignPreference(false)).not.toThrow();
    });
  });
});
