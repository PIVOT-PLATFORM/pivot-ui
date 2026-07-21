/**
 * Declarative canvas templates behind the facilitation activities that need no server-side state.
 *
 * Brainstorming, icebreaker and retrospective are *layouts*, not stateful activities: they seed the
 * board with titled frames (and optionally preselect a tool) using primitives that are already
 * persisted and broadcast — `frame:create` + `frame:update`. Nothing here needs a backend entity,
 * which is what separates them from the poll (no `collaboratif` schema yet) and from the quiz /
 * dot-vote, which own real tables (`V9__quiz.sql`, `V4__vote.sql`) and therefore live in their own
 * store APIs rather than in this file.
 *
 * Frame titles are carried as Transloco **keys**, never as literals: resolution happens in the
 * hosting component, so this module stays free of user-facing strings.
 */
import type { ToolMode } from '../model/tools';

/** Frame width applied server-side on `frame:create` (see `Frame.java` — `width = 400`). */
const FRAME_WIDTH = 400;

/** Frame height applied server-side on `frame:create` (see `Frame.java` — `height = 300`). */
const FRAME_HEIGHT = 300;

/** Horizontal gap between two frames of a multi-column template. */
const FRAME_GAP = 40;

/** A canvas template seeded by an activity. */
export interface ActivityTemplate {
  /** Transloco keys of the frame titles, laid out left to right. */
  readonly frameTitleKeys: readonly string[];
  /** Tool to preselect once the frames exist, so the facilitator can write straight away. */
  readonly tool?: ToolMode;
}

/** Top-left corner of one frame to create, in canvas units, with its resolved title. */
export interface ActivityFramePlacement {
  readonly posX: number;
  readonly posY: number;
  readonly titleKey: string;
}

/**
 * Templates by activity id. Activities absent from this map are either already wired to a stateful
 * implementation (`timer`, `dotvote`, `quiz`) or not implementable client-side (`poll`).
 */
export const ACTIVITY_TEMPLATES: Readonly<Record<string, ActivityTemplate>> = {
  brainstorming: {
    frameTitleKeys: ['whiteboard.activities.templates.brainstorming.ideas'],
    tool: 'sticky',
  },
  icebreaker: {
    frameTitleKeys: ['whiteboard.activities.templates.icebreaker.question'],
    tool: 'sticky',
  },
  retro: {
    frameTitleKeys: [
      'whiteboard.activities.templates.retro.wentWell',
      'whiteboard.activities.templates.retro.toImprove',
      'whiteboard.activities.templates.retro.actions',
    ],
    tool: 'sticky',
  },
};

/**
 * Lays a template's frames out as a centred row around a canvas-space anchor — normally the
 * viewport centre, so a template launched after panning lands where the facilitator is looking
 * rather than at the board origin.
 *
 * @param template the template to lay out
 * @param centre canvas-space point the row is centred on
 * @returns one placement per frame, left to right
 */
export function layoutActivityFrames(
  template: ActivityTemplate,
  centre: { readonly x: number; readonly y: number },
): ActivityFramePlacement[] {
  const count = template.frameTitleKeys.length;
  const rowWidth = count * FRAME_WIDTH + (count - 1) * FRAME_GAP;
  const startX = centre.x - rowWidth / 2;
  const posY = centre.y - FRAME_HEIGHT / 2;
  return template.frameTitleKeys.map((titleKey, i) => ({
    posX: startX + i * (FRAME_WIDTH + FRAME_GAP),
    posY,
    titleKey,
  }));
}
