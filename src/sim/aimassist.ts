/**
 * Pistol aim assist for fingers and controllers (P12-A). A finger is wider than a drone, so a shot
 * aimed near an enemy locks onto it. Mouse aim is never touched. Pure and deterministic.
 */
export const AIM_ASSIST = {
  /** A finger this close to a target (tiles) picks it outright. */
  tap: 1.6,
  /** Otherwise the target must lie within this angle (radians) of the aimed direction. */
  cone: 0.3,
  /** With the controller's aim stick at rest the cone around the facing direction is wider. */
  restCone: 0.85,
  /** Furthest target (tiles) a lock reaches. */
  range: 13,
} as const;

export interface AimTarget {
  /** Stable key (enemy id, or -1 for the boss). */
  id: number;
  /** Body centre in tiles. */
  x: number;
  y: number;
}

export interface AimQuery {
  /** Muzzle. */
  ox: number;
  oy: number;
  /** Aimed direction (need not be unit length). */
  dx: number;
  dy: number;
  /** Finger point in tile units, if a finger is aiming. */
  finger: { x: number; y: number } | null;
  cone: number;
  /** True when no wall stands between the muzzle and the point. */
  sees: (x: number, y: number) => boolean;
}

/** The target to lock, or null to shoot exactly where aimed. */
export function pickTarget(q: AimQuery, targets: readonly AimTarget[]): AimTarget | null {
  const heading = Math.atan2(q.dy, q.dx);
  let best: AimTarget | null = null;
  let bestScore = Infinity;
  for (const t of targets) {
    const dist = Math.hypot(t.x - q.ox, t.y - q.oy);
    if (dist > AIM_ASSIST.range) continue;
    const near = q.finger ? Math.hypot(t.x - q.finger.x, t.y - q.finger.y) : Infinity;
    let off = Math.abs(Math.atan2(t.y - q.oy, t.x - q.ox) - heading);
    if (off > Math.PI) off = 2 * Math.PI - off;
    // Tapped targets always beat cone targets; then the smallest angle, nearer on a near tie.
    const score = near <= AIM_ASSIST.tap ? near - 10 : off <= q.cone ? off + dist * 0.02 : Infinity;
    if (score < bestScore && q.sees(t.x, t.y)) {
      best = t;
      bestScore = score;
    }
  }
  return best;
}
