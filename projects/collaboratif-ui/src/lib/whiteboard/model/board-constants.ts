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

/**
 * Viewport zoom bounds.
 *
 * {@link MIN_ZOOM} is the *default* floor only: US08.3.5 lowers it further on boards whose content
 * would not otherwise fit — see `computeMinZoom` in `board-geometry.ts`, which is the value every
 * zoom-out path must clamp against, never this constant alone.
 */
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3;

/**
 * Margin (screen px) left around the content when fitting it to the viewport (US08.3.5, §4.1).
 *
 * Shared with the "fit to content" / "fit to selection" commands of US08.11.2 so a fitted board and
 * a fully zoomed-out board frame their content with the same breathing room.
 */
export const FIT_PAD = 64;

/**
 * Fraction of the "everything just fits" zoom that {@link MIN_ZOOM}'s dynamic counterpart allows
 * (US08.3.5).
 *
 * Below 1, so the user can always zoom out *past* the point where the board merely fits — landing
 * exactly on the fit would leave the content flush against the viewport edges with no way to pull
 * back and see it as a whole.
 */
export const MIN_ZOOM_HEADROOM = 0.6;

/**
 * Wheel-zoom sensitivity (US08.11.2, §4.1) — the exponent base applied to `deltaY`.
 *
 * Two values, not one: a plain scroll is often incidental, so it zooms gently, while Ctrl/Cmd —
 * which is also what browsers report for a trackpad pinch — signals a deliberate zoom and moves an
 * order of magnitude faster.
 */
export const WHEEL_ZOOM_BASE_SLOW = 0.0008;
export const WHEEL_ZOOM_BASE_FAST = 0.01;

/**
 * Absolute bound on a single wheel event's zoom exponent (US08.11.2).
 *
 * A safety rail against non-finite results, not a feel-shaping parameter — see `wheelZoom` in
 * `board-geometry.ts`. Set far outside any real gesture: a Ctrl+wheel notch produces an exponent
 * of about 1.
 */
export const WHEEL_EXPONENT_LIMIT = 20;

/**
 * Delay (ms) before a wheel burst is committed to the viewport signal (US08.11.2).
 *
 * A wheel gesture fires dozens of events; without this, each one writes the signal and re-runs
 * every dependent computed. The zoom still *tracks* the wheel — the pending value is applied on
 * this trailing edge, which is short enough to read as immediate.
 */
export const WHEEL_COMMIT_DEBOUNCE_MS = 80;

/** Zoom step applied by the toolbar's +/− buttons (US08.11.2) — ×1,25 in, ÷1,25 out. */
export const ZOOM_STEP = 1.25;

/** Zoom ceiling of "fit to content" — never magnifies past 100 % (US08.11.2). */
export const FIT_CONTENT_MAX_ZOOM = 1;

/**
 * Zoom ceiling of "fit to selection" (US08.11.2).
 *
 * Above 100 %, unlike {@link FIT_CONTENT_MAX_ZOOM}: zooming to a single small card is precisely
 * when magnifying past 1× is what the user wants.
 */
export const FIT_SELECTION_MAX_ZOOM = 1.5;

/** How long the one-shot open-the-board auto-fit stays armed (ms, US08.11.2). */
export const AUTO_FIT_WINDOW_MS = 2000;

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
 * `localStorage` key backing the alignment-guides toggle (US08.11.4).
 *
 * Same `klx_` provenance as {@link GRID_STORAGE_KEY} — the spec pins the reference POC's key name
 * verbatim. Note the inverted default relative to the grid: guides are **on** unless the stored
 * value is exactly `'0'`.
 */
export const ALIGN_STORAGE_KEY = 'klx_board_align';

/** Colour of the alignment guide lines (US08.11.4, §4.3/§7) — a literal, never user-derived. */
export const ALIGN_GUIDE_COLOR = '#ec4899';

/** Stacking order of the alignment guide lines (US08.11.4, §4.3/§7). */
export const ALIGN_GUIDE_Z_INDEX = 60;

/**
 * Reads the persisted alignment-guides preference (US08.11.4).
 *
 * **On by default** — the mirror image of {@link readGridPreference}: only the exact string `'0'`
 * disables the guides, so an absent key, a corrupted value or a hand-forged one all fall back to
 * enabled. The stored string is only ever compared, never injected into the DOM nor evaluated.
 *
 * @returns `true` when the alignment guides are enabled, `false` otherwise
 */
export function readAlignPreference(): boolean {
  if (typeof localStorage === 'undefined') {
    return true;
  }
  try {
    return localStorage.getItem(ALIGN_STORAGE_KEY) !== '0';
  } catch {
    // Private-browsing quotas or a disabled storage must not break canvas init.
    return true;
  }
}

/**
 * Persists the alignment-guides preference (US08.11.4).
 *
 * Client-only preference: no STOMP message, no server write — a second participant on the same
 * board is unaffected.
 *
 * @param enabled the state to persist
 */
export function writeAlignPreference(enabled: boolean): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(ALIGN_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Ignored on purpose — see readGridPreference.
  }
}

/** A card considered as an alignment target by {@link computeAlignGuides}. */
export interface AlignBox {
  id: string;
  type: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
}

/**
 * The result of an alignment probe: the guide lines to draw and the correction to apply.
 *
 * `v`/`h` are canvas coordinates of the vertical / horizontal guide, or `null` when no candidate
 * landed within tolerance on that axis. `dx`/`dy` are the deltas that move the dragged card onto
 * the matched edge — `0` on an axis without a guide, so the caller can add them unconditionally.
 */
export interface AlignGuides {
  v: number | null;
  h: number | null;
  dx: number;
  dy: number;
}

/** Neutral result — no guide on either axis, no correction. */
const NO_GUIDES: AlignGuides = { v: null, h: null, dx: 0, dy: 0 };

/**
 * Finds the best alignment guide per axis for a card being dragged (US08.11.4, §4.3).
 *
 * Compares the dragged card's three landmarks per axis (`[x, x + w/2, x + w]` horizontally,
 * `[y, y + h/2, y + h]` vertically) against the same three landmarks of every other card. The
 * single closest candidate within tolerance wins on each axis, so at most one vertical and one
 * horizontal line are ever produced — never a thicket of near-misses.
 *
 * The tolerance is expressed in **screen** pixels ({@link ALIGN_SNAP_PX}) and divided by `zoom`
 * before comparison, so the guides feel equally reachable whatever the zoom level: at 3× a 6 px
 * screen gap is only 2 canvas px, at 0.5× it is 12.
 *
 * `DRAW` cards are excluded as targets: a freehand stroke's bounding box has no meaningful edge to
 * align against — its visual extent is the path, not the box.
 *
 * @param moving the dragged card's candidate geometry (already offset by the pointer delta)
 * @param others every other card on the board; the dragged card and `DRAW` cards are filtered out
 * @param zoom the current viewport zoom; a non-finite or non-positive value yields no guides
 * @returns the guides to render and the snap correction to apply
 */
export function computeAlignGuides(
  moving: { id: string; x: number; y: number; width: number; height: number },
  others: readonly AlignBox[],
  zoom: number,
): AlignGuides {
  if (!Number.isFinite(zoom) || zoom <= 0) {
    // Defensive: a zero/NaN zoom would turn the tolerance into Infinity/NaN and match everything.
    return NO_GUIDES;
  }
  const tolerance = ALIGN_SNAP_PX / zoom;
  const vSelf = [moving.x, moving.x + moving.width / 2, moving.x + moving.width];
  const hSelf = [moving.y, moving.y + moving.height / 2, moving.y + moving.height];

  let vBest: { line: number; delta: number; dist: number } | null = null;
  let hBest: { line: number; delta: number; dist: number } | null = null;

  for (const other of others) {
    if (other.id === moving.id || other.type === 'DRAW') {
      continue;
    }
    const vOther = [other.posX, other.posX + other.width / 2, other.posX + other.width];
    const hOther = [other.posY, other.posY + other.height / 2, other.posY + other.height];

    for (const self of vSelf) {
      for (const target of vOther) {
        const dist = Math.abs(self - target);
        if (dist <= tolerance && (vBest === null || dist < vBest.dist)) {
          vBest = { line: target, delta: target - self, dist };
        }
      }
    }
    for (const self of hSelf) {
      for (const target of hOther) {
        const dist = Math.abs(self - target);
        if (dist <= tolerance && (hBest === null || dist < hBest.dist)) {
          hBest = { line: target, delta: target - self, dist };
        }
      }
    }
  }

  return {
    v: vBest?.line ?? null,
    h: hBest?.line ?? null,
    dx: vBest?.delta ?? 0,
    dy: hBest?.delta ?? 0,
  };
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
