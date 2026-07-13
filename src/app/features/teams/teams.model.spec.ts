import { describe, it, expect } from 'vitest';
import {
  UNITS,
  LEADERSHIP,
  LEAD_ROLE_META,
  ancestorChain,
  rollupCount,
  unitById,
  unitDepth,
} from './teams.model';

describe('teams.model', () => {
  describe('rollupCount', () => {
    it('returns the direct count for a leaf unit (no children)', () => {
      // pole-secu has 3 direct members and no descendants.
      expect(rollupCount('pole-secu')).toBe(3);
    });

    it('sums a unit and every descendant', () => {
      // dept-ing (1) + pole-backend (6) + pole-frontend (5) + pole-secu (3) = 15
      expect(rollupCount('dept-ing')).toBe(15);
      // dept-prod (1) + pole-pm (4) + pole-design (3) = 8
      expect(rollupCount('dept-prod')).toBe(8);
    });

    it('rolls up the whole tree from the root', () => {
      // groupe (1) + entreprise (1) + division subtree (23) = 25
      expect(rollupCount('groupe')).toBe(25);
    });

    it('returns 0 for an unknown unit', () => {
      expect(rollupCount('does-not-exist')).toBe(0);
    });
  });

  describe('unitDepth', () => {
    it('is 0 for the root and increments down the tree', () => {
      expect(unitDepth('groupe')).toBe(0);
      expect(unitDepth('entreprise')).toBe(1);
      expect(unitDepth('division')).toBe(3);
      expect(unitDepth('pole-backend')).toBe(5);
    });

    it('is 0 for an unknown unit (no parent chain)', () => {
      expect(unitDepth('nope')).toBe(0);
    });
  });

  describe('ancestorChain', () => {
    it('returns the inclusive root→unit chain', () => {
      expect(ancestorChain('pole-secu').map(u => u.id)).toEqual([
        'groupe',
        'entreprise',
        'direction',
        'division',
        'dept-ing',
        'pole-secu',
      ]);
    });

    it('returns just the root for the root itself', () => {
      expect(ancestorChain('groupe').map(u => u.id)).toEqual(['groupe']);
    });

    it('returns an empty chain for an unknown unit', () => {
      expect(ancestorChain('nope')).toEqual([]);
    });
  });

  describe('unitById', () => {
    it('resolves a known unit', () => {
      expect(unitById('division')?.name).toBe('Division Plateforme');
    });

    it('returns undefined for an unknown id', () => {
      expect(unitById('nope')).toBeUndefined();
    });
  });

  describe('data integrity', () => {
    it('every non-root unit points at an existing parent', () => {
      const ids = new Set(UNITS.map(u => u.id));
      for (const u of UNITS) {
        if (u.parent !== null) {
          expect(ids.has(u.parent)).toBe(true);
        }
      }
    });

    it('leadership entries only reference existing units', () => {
      const ids = new Set(UNITS.map(u => u.id));
      for (const unitId of Object.keys(LEADERSHIP)) {
        expect(ids.has(unitId)).toBe(true);
      }
    });

    it('maps every leadership role to a label + tone kind', () => {
      expect(LEAD_ROLE_META.RESPONSABLE).toEqual({ label: 'Responsable', kind: 'responsable' });
      expect(LEAD_ROLE_META.ADJOINT).toEqual({ label: 'Adjoint', kind: 'adjoint' });
    });
  });
});
