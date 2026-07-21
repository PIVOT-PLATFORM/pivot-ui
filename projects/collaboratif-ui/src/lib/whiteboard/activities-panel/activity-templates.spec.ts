import { describe, it, expect } from 'vitest';
import { ACTIVITY_TEMPLATES, layoutActivityFrames } from './activity-templates';

describe('activity templates', () => {
  it('covers exactly the activities implementable without a backend entity', () => {
    // timer / dotvote / quiz own real server state and are wired separately; poll has none yet.
    expect(Object.keys(ACTIVITY_TEMPLATES).sort()).toEqual(['brainstorming', 'icebreaker', 'retro']);
  });

  it('lays the retrospective out as three columns, left to right', () => {
    const placements = layoutActivityFrames(ACTIVITY_TEMPLATES['retro'], { x: 0, y: 0 });

    expect(placements).toHaveLength(3);
    expect(placements.map((p) => p.titleKey)).toEqual([
      'whiteboard.activities.templates.retro.wentWell',
      'whiteboard.activities.templates.retro.toImprove',
      'whiteboard.activities.templates.retro.actions',
    ]);
    // 3 frames of 400 + 2 gaps of 40 = 1280 wide, centred on x=0 → starts at -640.
    expect(placements.map((p) => p.posX)).toEqual([-640, -200, 240]);
    // Frames sit on one row.
    expect(new Set(placements.map((p) => p.posY)).size).toBe(1);
  });

  it('centres the row on the supplied anchor rather than the board origin', () => {
    const at0 = layoutActivityFrames(ACTIVITY_TEMPLATES['retro'], { x: 0, y: 0 });
    const at1000 = layoutActivityFrames(ACTIVITY_TEMPLATES['retro'], { x: 1000, y: 500 });

    expect(at1000.map((p) => p.posX)).toEqual(at0.map((p) => p.posX + 1000));
    expect(at1000[0].posY).toBe(at0[0].posY + 500);
  });

  it('centres a single-frame template on the anchor', () => {
    const [frame] = layoutActivityFrames(ACTIVITY_TEMPLATES['brainstorming'], { x: 100, y: 100 });

    // 400×300 frame centred on (100,100) → top-left at (-100,-50).
    expect(frame.posX).toBe(-100);
    expect(frame.posY).toBe(-50);
  });

  it('preselects the sticky tool for every template so the facilitator can write straight away', () => {
    for (const template of Object.values(ACTIVITY_TEMPLATES)) {
      expect(template.tool).toBe('sticky');
    }
  });

  it('carries i18n keys, never user-facing literals', () => {
    const keys = Object.values(ACTIVITY_TEMPLATES).flatMap((t) => t.frameTitleKeys);

    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key).toMatch(/^whiteboard\.activities\.templates\./);
    }
  });
});
