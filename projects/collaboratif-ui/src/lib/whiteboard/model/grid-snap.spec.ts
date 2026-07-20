import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  DOT_SPACING,
  GRID_STORAGE_KEY,
  snapToGrid,
  readGridPreference,
  writeGridPreference,
} from './board-constants';

/**
 * US08.11.1 — grid snapping: rounding contract and browser-local persistence.
 *
 * The rounding boundaries below are the ones pinned by the spec (11 -> 0, 12 -> 24, 36 -> 24,
 * 37 -> 48): they lock the midpoint behaviour of `Math.round`, which is the whole difference
 * between a hard snap and a "nearest line within tolerance" snap.
 */
describe('grid snap (US08.11.1)', () => {
  describe('snapToGrid', () => {
    it('uses a 24 px grid', () => {
      expect(DOT_SPACING).toBe(24);
    });

    it.each([
      [0, 0],
      [11, 0],
      [12, 24],
      [37, 48],
      [24, 24],
      [48, 48],
    ])('rounds %i to %i', (input, expected) => {
      expect(snapToGrid(input)).toBe(expected);
    });

    /**
     * ⚠️ Écart assumé avec la spec — à arbitrer par le PO.
     *
     * L'US US08.11.1 impose la formule `Math.round(coord / 24) * 24` **et** liste `36 -> 24`
     * parmi ses valeurs limites. Les deux sont contradictoires : 36 est exactement à mi-chemin
     * entre 24 et 48, et `Math.round(1.5)` vaut 2 en JavaScript (les demis vont vers +∞), donc la
     * formule rend 48.
     *
     * La formule, normative et répétée dans les AC comme dans les notes d'implémentation, prime
     * ici sur la valeur d'exemple. Ce test verrouille le comportement réel pour que l'arbitrage
     * soit visible plutôt que silencieux : si le PO tranche pour 36 -> 24, c'est la formule qu'il
     * faudra changer (arrondi des demis vers le bas), et ce test échouera pour le signaler.
     */
    it('rounds the exact midpoint up, per the formula (36 -> 48, spec example says 24)', () => {
      expect(snapToGrid(36)).toBe(48);
    });

    it('rounds negative coordinates symmetrically (boards extend past the origin)', () => {
      expect(snapToGrid(-11)).toBe(-0);
      expect(snapToGrid(-13)).toBe(-24);
      expect(snapToGrid(-36)).toBe(-24);
    });

    it('is idempotent — snapping an already-snapped value changes nothing', () => {
      const once = snapToGrid(37);
      expect(snapToGrid(once)).toBe(once);
    });

    it('is a hard snap: a coordinate far from any grid line is still rounded', () => {
      // A tolerance-based snap would leave 1000 untouched (nearest line is 4 px away only if
      // you look for it); a hard snap always lands on a multiple.
      expect(snapToGrid(1000) % DOT_SPACING).toBe(0);
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

    it('defaults to off when the key is absent', () => {
      expect(readGridPreference()).toBe(false);
    });

    it("reads '1' as enabled and '0' as disabled", () => {
      localStorage.setItem(GRID_STORAGE_KEY, '1');
      expect(readGridPreference()).toBe(true);

      localStorage.setItem(GRID_STORAGE_KEY, '0');
      expect(readGridPreference()).toBe(false);
    });

    it.each(['', 'true', 'yes', '2', '{"a":1}', '<script>alert(1)</script>'])(
      'falls back to off for the corrupted value %j, without throwing',
      value => {
        localStorage.setItem(GRID_STORAGE_KEY, value);
        expect(() => readGridPreference()).not.toThrow();
        expect(readGridPreference()).toBe(false);
      },
    );

    it("writes '1'/'0' under the spec's key", () => {
      writeGridPreference(true);
      expect(localStorage.getItem(GRID_STORAGE_KEY)).toBe('1');

      writeGridPreference(false);
      expect(localStorage.getItem(GRID_STORAGE_KEY)).toBe('0');
    });

    it('round-trips through storage', () => {
      writeGridPreference(true);
      expect(readGridPreference()).toBe(true);
    });

    it('survives a storage that throws (private browsing, quota exceeded)', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('denied');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('quota');
      });

      // A display preference must never break canvas init.
      expect(() => readGridPreference()).not.toThrow();
      expect(readGridPreference()).toBe(false);
      expect(() => writeGridPreference(true)).not.toThrow();
    });
  });
});
