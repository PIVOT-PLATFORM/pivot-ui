/**
 * Pure geometry helpers for the structured whiteboard — viewport transforms,
 * bounding boxes, connection edge-anchoring. Ported from the interaction math in
 * the PouetPouet `board-canvas.tsx` / `connection-line.tsx`.
 */
import type { Card, Frame } from './board.types';
import { FIT_PAD, MIN_ZOOM, MIN_ZOOM_HEADROOM } from './board-constants';

/** Canvas viewport: pan offset (screen px) + zoom factor. */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/** Axis-aligned rectangle in canvas (board) coordinates. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Screen point → canvas (board) point, given a viewport. */
export function screenToCanvas(sx: number, sy: number, vp: Viewport): { x: number; y: number } {
  return { x: (sx - vp.x) / vp.zoom, y: (sy - vp.y) / vp.zoom };
}

/** Canvas (board) point → screen point, given a viewport. */
export function canvasToScreen(cx: number, cy: number, vp: Viewport): { x: number; y: number } {
  return { x: cx * vp.zoom + vp.x, y: cy * vp.zoom + vp.y };
}

/** Bounding rect of a card. */
export function cardRect(c: Pick<Card, 'posX' | 'posY' | 'width' | 'height'>): Rect {
  return { x: c.posX, y: c.posY, width: c.width, height: c.height };
}

/** Bounding rect of a frame. */
export function frameRect(f: Pick<Frame, 'posX' | 'posY' | 'width' | 'height'>): Rect {
  return { x: f.posX, y: f.posY, width: f.width, height: f.height };
}

/** True if point (px,py) is inside rect. */
export function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;
}

/** True if two rects overlap (used for marquee selection). */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Center point of a rect. */
export function rectCenter(r: Rect): { x: number; y: number } {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/** Bounding box enclosing a set of rects (null when empty). */
export function unionRect(rects: Rect[]): Rect | null {
  if (rects.length === 0) {
    return null;
  }
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.width));
  const maxY = Math.max(...rects.map((r) => r.y + r.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export type EdgeSide = 'N' | 'S' | 'E' | 'W';

/** The four cardinal edge sides, in a stable order (used to enumerate anchors). */
export const CARDINAL_SIDES: readonly EdgeSide[] = ['N', 'E', 'S', 'W'];

/** Midpoint of the given edge `side` of rect `r` — the connector attach point for that side. */
export function edgeAnchorPoint(r: Rect, side: EdgeSide): { x: number; y: number } {
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  switch (side) {
    case 'N':
      return { x: cx, y: r.y };
    case 'S':
      return { x: cx, y: r.y + r.height };
    case 'E':
      return { x: r.x + r.width, y: cy };
    case 'W':
      return { x: r.x, y: cy };
  }
}

/** Edge side of `r` whose midpoint is closest to point `p` (used for hover anchor snapping). */
export function nearestEdgeSide(r: Rect, p: { x: number; y: number }): EdgeSide {
  let best: EdgeSide = 'N';
  let bestDist = Infinity;
  for (const side of CARDINAL_SIDES) {
    const a = edgeAnchorPoint(r, side);
    const dist = (a.x - p.x) ** 2 + (a.y - p.y) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = side;
    }
  }
  return best;
}

/**
 * Picks the anchor point on `from`'s edge facing `to`'s center, plus the edge side.
 *
 * The direction is compared **relative to each half-extent** (`|dx| / (w/2)` vs `|dy| / (h/2)`),
 * not on the raw deltas — exact parity with PouetPouet's `anchorSide` (`connection-line.tsx`).
 * The Angular port previously compared raw `|dx| > |dy|`, which biased wide cards (the default
 * 180×140 sticky is wider than tall) toward the E/W sides, so connectors rendered as horizontal
 * bars even when the cards were stacked vertically. Normalising by the half-extent restores the
 * geometry-faithful side choice.
 */
export function edgeAnchor(from: Rect, to: Rect): { x: number; y: number; side: EdgeSide } {
  const fc = rectCenter(from);
  const tc = rectCenter(to);
  const dx = tc.x - fc.x;
  const dy = tc.y - fc.y;
  const horiz = Math.abs(dx) / (from.width / 2 || 1) >= Math.abs(dy) / (from.height / 2 || 1);
  const side: EdgeSide = horiz ? (dx >= 0 ? 'E' : 'W') : dy >= 0 ? 'S' : 'N';
  return { ...edgeAnchorPoint(from, side), side };
}

/**
 * The lowest zoom the user may reach on this board (US08.3.5).
 *
 * The fixed {@link MIN_ZOOM} is a sensible floor for an ordinary board, but on a very large one it
 * stops the user *above* the point where the whole content is visible — the board can never be
 * taken in at a glance. This lowers the floor just for those boards: it computes the zoom at which
 * everything would exactly fit ({@link FIT_PAD} of margin on each side), keeps a fraction of it as
 * headroom ({@link MIN_ZOOM_HEADROOM}) so the user can still pull back past the bare fit, and
 * returns whichever of that and {@link MIN_ZOOM} is lower.
 *
 * Taking the **minimum** is what makes this a pure extension: on a board whose content already fits
 * comfortably, the computed value sits above {@link MIN_ZOOM} and the fixed floor keeps winning, so
 * behaviour there is bit-for-bit unchanged. Only boards that need it get a lower floor.
 *
 * @param content bounding rects of every card and frame on the board; an empty array means an
 *                empty board, for which there is nothing to fit
 * @param viewportWidth  the canvas surface width in screen px
 * @param viewportHeight the canvas surface height in screen px
 * @returns the effective minimum zoom — always ≤ {@link MIN_ZOOM}, never zero, never `NaN`
 */
export function computeMinZoom(content: readonly Rect[], viewportWidth: number, viewportHeight: number): number {
  const box = unionRect([...content]);
  if (box === null || box.width <= 0 || box.height <= 0) {
    // Empty board, or content collapsed to a point/line: nothing to fit, keep the fixed floor.
    return MIN_ZOOM;
  }
  const availableW = viewportWidth - FIT_PAD * 2;
  const availableH = viewportHeight - FIT_PAD * 2;
  if (!(availableW > 0) || !(availableH > 0)) {
    // Viewport smaller than the padding it would need (unmeasured surface, collapsed panel): a
    // negative "available" space would invert the fit and yield a negative zoom.
    return MIN_ZOOM;
  }
  const fitAll = Math.min(availableW / box.width, availableH / box.height);
  if (!Number.isFinite(fitAll) || fitAll <= 0) {
    return MIN_ZOOM;
  }
  return Math.min(MIN_ZOOM, fitAll * MIN_ZOOM_HEADROOM);
}
