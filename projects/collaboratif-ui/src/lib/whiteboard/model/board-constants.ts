/**
 * Geometry / interaction constants for the structured whiteboard.
 * Ported from the PouetPouet reference (`board-card-constants.ts`, `board-canvas.tsx`).
 */

/** Minimum card width (sticky / text / table). */
export const MIN_W = 150;
/** Minimum card height (sticky / text / table). */
export const MIN_H = 110;
/** Minimum shape size. */
export const SHAPE_MIN = 80;
/**
 * Minimum size of a `line` shape's box, on either axis.
 *
 * A line is the diagonal of its box, so a straight horizontal or vertical one needs a box that is
 * flat on one axis — {@link SHAPE_MIN} on both axes makes that shape structurally impossible.
 * Lines therefore get their own floor; every other shape keeps {@link SHAPE_MIN}.
 */
export const LINE_MIN = 1;
/** Angle step (degrees) a line snaps to while Shift is held — Figma/Miro convention. */
export const LINE_SNAP_DEG = 15;
/** Below this drag length (canvas px), a line gesture commits nothing: it reads as a click. */
export const LINE_MIN_DRAG = 4;
/**
 * Width (px) of the invisible stroke that catches pointers along a line — the line's clickable
 * area is this band around it, not its bounding box (see `board-card.component.scss`). Raise it to
 * make lines easier to grab, lower it if they start stealing clicks from what sits behind them.
 */
export const LINE_HIT_WIDTH = 12;
/** Minimum label width — deterministic box so resize handles stay aligned. */
export const MIN_LABEL_W = 60;

/** Viewport zoom bounds. */
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3;

/** Dotted-grid spacing (canvas pixels). */
export const DOT_SPACING = 24;

/** Smart-alignment snap distance (screen pixels). */
export const ALIGN_SNAP_PX = 6;

/** Card count above which off-screen cards are virtualized. */
export const VIRTUALIZE_THRESHOLD = 100;

/** Undo/redo history depth. */
export const HISTORY_LIMIT = 30;

/** Local cursor emit throttle (ms). */
export const CURSOR_THROTTLE_MS = 50;

/** Paste / duplicate offset (canvas pixels). */
export const PASTE_OFFSET = 16;

/** Default new-card dimensions. */
export const DEFAULT_CARD_W = 180;
export const DEFAULT_CARD_H = 140;

/** Default dimensions for a new LINK card (US08.6.5) — wider than a sticky to fit an OG preview. */
export const LINK_CARD_W = 280;
export const LINK_CARD_H = 170;

/**
 * `localStorage` key backing the grid-snap toggle (US08.11.1).
 *
 * The `klx_` prefix is inherited from the PouetPouet reference POC, whose key name the spec
 * pins verbatim so an existing user preference survives the re-platforming.
 */
export const GRID_STORAGE_KEY = 'klx_board_grid';

/**
 * Rounds a canvas coordinate to the nearest {@link DOT_SPACING} multiple (US08.11.1).
 *
 * Hard snap, deliberately without a tolerance radius: the spec requires the rounding to apply
 * systematically while the grid is on, not only near a grid line. `Math.round` puts the midpoint
 * on the upper multiple (12 -> 24, 11 -> 0, 36 -> 24, 37 -> 48).
 *
 * @param coord the raw canvas coordinate
 * @returns the coordinate rounded to the nearest grid multiple
 */
export function snapToGrid(coord: number): number {
  return Math.round(coord / DOT_SPACING) * DOT_SPACING;
}

/**
 * Reads the persisted grid-snap preference (US08.11.1).
 *
 * Off by default. Any value other than `'1'` — absent key, corrupted content, or a key forged by
 * hand — falls back silently to off: the stored string is only ever compared, never injected into
 * the DOM nor evaluated, so a crafted value carries no injection surface.
 *
 * @returns `true` when the grid snap is enabled, `false` otherwise
 */
export function readGridPreference(): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }
  try {
    return localStorage.getItem(GRID_STORAGE_KEY) === '1';
  } catch {
    // Private-browsing quotas or a disabled storage must not break canvas init.
    return false;
  }
}

/**
 * Persists the grid-snap preference (US08.11.1).
 *
 * Client-only preference: no STOMP message, no server write — a second participant on the same
 * board is unaffected. Storage failures are swallowed for the same reason as in
 * {@link readGridPreference}: a display preference must never break the canvas.
 *
 * @param enabled the state to persist
 */
export function writeGridPreference(enabled: boolean): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(GRID_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Ignored on purpose — see readGridPreference.
  }
}
