/**
 * Camera lead (render only): the view drifts ahead of the player in the direction of travel, and
 * drops ahead during a long fall so the landing spot is on screen before you reach it.
 * Pure functions; the renderer keeps the eased state.
 */

export const CAM_LEAD = {
  /** Seconds of horizontal speed to look ahead (tiles = vx * x), capped at maxX tiles. */
  x: 0.32,
  maxX: 2.2,
  /** Falls faster than this (tiles/s) start leading downward, fallK tiles per tile/s over it, capped at maxY. */
  fallFrom: 9,
  fallK: 0.22,
  maxY: 3,
  /** Ease rate per second toward the target (slow enough that a turn-around never whips the view). */
  ease: 3.2,
};

export interface Lead {
  x: number;
  y: number;
}

/** Where the camera wants to sit relative to the player, in tiles. */
export function leadTarget(vx: number, vy: number, onGround: boolean): Lead {
  const x = Math.max(-CAM_LEAD.maxX, Math.min(CAM_LEAD.maxX, vx * CAM_LEAD.x));
  const y = !onGround && vy > CAM_LEAD.fallFrom ? Math.min(CAM_LEAD.maxY, (vy - CAM_LEAD.fallFrom) * CAM_LEAD.fallK) : 0;
  return { x, y };
}

/** Ease the current lead toward the target (frame-rate independent). */
export function easeLead(cur: Lead, target: Lead, dt: number): Lead {
  const k = 1 - Math.exp(-CAM_LEAD.ease * Math.max(0, dt));
  return { x: cur.x + (target.x - cur.x) * k, y: cur.y + (target.y - cur.y) * k };
}
