/**
 * Axis lock for canvas drags (US08.11.8).
 *
 * Holding Shift while dragging constrains the movement to a single axis, so a card can travel far
 * along a column or a row without ever drifting off it. The whole mechanism is expressed here as
 * pure functions over plain geometry: the canvas component owns the lock's lifetime, this module
 * owns the arithmetic.
 */

/**
 * How far the pointer must travel, in **screen** pixels, before an axis is picked.
 *
 * Below this the lock stays undecided and the drag remains free — pressing Shift must not freeze
 * the card before the user has expressed a direction. Screen pixels rather than canvas units so
 * the feel is identical at every zoom level.
 */
export const AXIS_LOCK_THRESHOLD_PX = 8;

/**
 * How far ahead, in **screen** pixels, the other axis must be before an already-chosen axis flips.
 *
 * A naive `|dx| > |dy|` test re-evaluated every frame makes the card flicker between horizontal
 * and vertical whenever the pointer travels near the diagonal — the documented reason some
 * implementations are perceived as unreliable. A margin makes the choice sticky, so a wobbling
 * hand cannot flip it.
 *
 * Deliberately an absolute margin rather than a ratio: the deltas are measured from the capture
 * and therefore grow without bound. A ratio would make the lock progressively harder to escape —
 * after 400 px along the free axis, a x1.5 rule would demand 600 px on the other one, effectively
 * trapping the user on a long column run, which is this feature's main use case. A fixed margin
 * keeps the flip reachable at any distance while still absorbing tremor.
 */
export const AXIS_LOCK_HYSTERESIS_PX = 12;

/** Dash and gap length of the locked-axis line, in screen pixels. */
export const AXIS_LOCK_DASH_PX = 4;

/**
 * The axis the card is still free to move along — the *locked* axis is the other one.
 *
 * `'x'` means the card slides horizontally and its Y is pinned; `'y'` is the reverse. `null` means
 * no axis has been decided yet (the pointer has not travelled far enough) and the drag is free.
 */
export type FreeAxis = 'x' | 'y' | null;

/** A live axis lock, captured the instant Shift went down and rebuilt on every fresh press. */
export interface AxisLock {
  /**
   * The card's **displayed** position at capture time — grid snap and alignment guides already
   * applied. This is what the pinned coordinate is held at, which is why pressing Shift after
   * landing on a guide keeps the card on that guide instead of yanking it back to where the drag
   * started.
   */
  readonly cardPos: { readonly x: number; readonly y: number };
  /** The pointer position at capture time; dominance is measured from here, never from the drag origin. */
  readonly pointerOrig: { readonly x: number; readonly y: number };
  /** The axis left free, or `null` while still under {@link AXIS_LOCK_THRESHOLD_PX}. */
  readonly freeAxis: FreeAxis;
}

/**
 * Picks the axis the drag is free to move along, given how far the pointer has travelled since the
 * lock was captured.
 *
 * Measuring from the capture rather than from the start of the gesture is what makes the feature
 * match the intent: a user who has already dragged 400 px horizontally and *then* presses Shift to
 * go down has accumulated a huge horizontal delta, so dominance computed from the drag origin
 * would lock the vertical axis and forbid the very move being asked for.
 *
 * @param current the axis decided so far, `null` while undecided
 * @param dx pointer travel since capture, canvas units
 * @param dy pointer travel since capture, canvas units
 * @param zoom current viewport zoom, used to express the threshold in screen pixels
 * @returns the axis left free — unchanged while the pointer stays inside the dead zone
 */
export function decideFreeAxis(current: FreeAxis, dx: number, dy: number, zoom: number): FreeAxis {
  if (!Number.isFinite(zoom) || zoom <= 0 || !Number.isFinite(dx) || !Number.isFinite(dy)) {
    // Defensive: a zero/NaN zoom would make the threshold Infinity/NaN and either freeze the lock
    // forever or trip it instantly. Keeping the current decision is the only safe answer.
    return current;
  }
  const threshold = AXIS_LOCK_THRESHOLD_PX / zoom;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < threshold) {
    return current;
  }
  if (current === null) {
    // Ties go to horizontal, arbitrarily but deterministically — an exact 45° press is vanishingly
    // rare and the hysteresis below settles anything close to it.
    return ax >= ay ? 'x' : 'y';
  }
  const margin = AXIS_LOCK_HYSTERESIS_PX / zoom;
  if (current === 'x' && ay > ax + margin) {
    return 'y';
  }
  if (current === 'y' && ax > ay + margin) {
    return 'x';
  }
  return current;
}

/**
 * Pins the locked coordinate back onto its captured value.
 *
 * Applied **after** the grid and the alignment guides, deliberately: `computeAlignGuides` returns
 * `dx`/`dy` that callers add unconditionally, so a guide matching on the locked axis would
 * otherwise drag the card off the axis it was told to hold. The free axis keeps whatever the grid
 * or the guides decided — locking one axis must not disable the assistance on the other.
 *
 * @param lock the live lock, or `null` when Shift is not held
 * @param pos the candidate position, grid/guides already applied
 * @returns the position with the locked coordinate restored, or `pos` untouched when undecided
 */
export function constrainToAxis(lock: AxisLock | null, pos: { x: number; y: number }): { x: number; y: number } {
  if (lock === null || lock.freeAxis === null) {
    return pos;
  }
  return lock.freeAxis === 'x' ? { x: pos.x, y: lock.cardPos.y } : { x: lock.cardPos.x, y: pos.y };
}

/**
 * Builds the dashed stroke used to paint the locked axis, as a repeating gradient.
 *
 * A gradient rather than `border-style: dashed` because these are filled `div`s, not bordered
 * boxes; and computed here rather than written in SCSS because the dash length is divided by the
 * zoom — the canvas layer scales it back up, so a fixed canvas length would stretch into a solid
 * bar once zoomed in.
 *
 * @param direction gradient axis: `to bottom` for a vertical line, `to right` for a horizontal one
 * @param color the guide colour, shared with the solid alignment guides
 * @param zoom current viewport zoom; non-finite or non-positive falls back to 1
 * @returns a CSS `repeating-linear-gradient` value
 */
export function axisLockDash(direction: 'to bottom' | 'to right', color: string, zoom: number): string {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const d = AXIS_LOCK_DASH_PX / safeZoom;
  return `repeating-linear-gradient(${direction}, ${color} 0 ${d}px, transparent ${d}px ${d * 2}px)`;
}
