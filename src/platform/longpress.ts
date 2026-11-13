/**
 * Touch long-press on a build-bar slot: tap selects, holding still for LONG_PRESS_MS opens that item's
 * actions (inventory with it selected). Pure so the timing and slop rules are unit-tested.
 */

/** How long a finger must stay down on a slot before its actions open. */
export const LONG_PRESS_MS = 450;
/** Finger travel (CSS px) that cancels a long-press (it became a drag or a slip). */
export const LONG_PRESS_SLOP = 14;

/** 0..1 progress of a hold, or -1 when it was cancelled by moving too far. */
export function longPressProgress(heldMs: number, dx: number, dy: number): number {
  if (Math.hypot(dx, dy) > LONG_PRESS_SLOP) return -1;
  return Math.max(0, Math.min(1, heldMs / LONG_PRESS_MS));
}
