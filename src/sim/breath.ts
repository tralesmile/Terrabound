/**
 * Breath and buoyancy (P12-A liquids v2). There is no oxygen bar to babysit: the suit holds a short
 * breath, then its scrubbers run off the battery, so a flooded shortcut costs dive time. Pure.
 */
export const BREATH = {
  /** Seconds the helmet can stay under before the scrubbers start. */
  hold: 3,
  /** Extra battery per second while the scrubbers run (before suit drain modifiers). */
  drain: 1.2,
  /** Held breath comes back this many times faster than it is spent. */
  recover: 3,
  /** Down speed while diving (holding down), tiles per second. */
  diveSpeed: 6,
  /** How quickly a floating suit settles at the surface (per second). */
  float: 8,
  /** A helmet less than this deep (tiles) bobs back up by itself, so a splash does not drown you. */
  buoyDepth: 2,
  /** How fast it bobs up, tiles per second. */
  buoySpeed: 1.5,
  /** A floating suit settles down this gently until its chin meets the water. */
  settle: 0.4,
  /** The waterline: the chin, this far above the feet (below the breathing visor). */
  chin: 1.2,
};

/** Advance seconds of breath spent. Climbs while the helmet is under, falls fast in air. */
export function stepBreath(spent: number, under: boolean, dt: number): number {
  return under ? Math.min(BREATH.hold, spent + dt) : Math.max(0, spent - dt * BREATH.recover);
}

/** True once the held breath is used up and the scrubbers are drawing battery. */
export function scrubbing(spent: number, under: boolean): boolean {
  return under && spent >= BREATH.hold;
}

/** HUD chip text: the breath left, then what the scrubbers cost per second. */
export function breathLabel(spent: number, drainMul: number): string {
  const left = BREATH.hold - spent;
  return left > 0 ? `HOLDING BREATH ${Math.ceil(left)}s` : `SCRUBBERS ON  BAT -${(BREATH.drain * drainMul).toFixed(1)}/s`;
}

/**
 * Vertical speed while swimming. Jump strokes up and down dives. Hands off, the suit is buoyant near
 * the surface: it settles with the chin at the waterline, a shallow dunk bobs back up and a deep one
 * sinks slowly. `under` and `shallow` describe the chin.
 */
export function swimVy(
  vy: number,
  c: { jump?: boolean; down?: boolean },
  under: boolean,
  shallow: boolean,
  dt: number,
  s: { gravity: number; up: number; sink: number },
): number {
  if (c.jump) return Math.max(-s.up, vy - s.gravity * 1.2 * dt);
  if (c.down) return Math.min(BREATH.diveSpeed, vy + s.gravity * 0.5 * dt);
  if (under && shallow) return vy + (-BREATH.buoySpeed - vy) * Math.min(1, BREATH.float * dt);
  if (under) return Math.min(s.sink, vy + s.gravity * 0.25 * dt);
  // Chin in the air: the suit's trapped air brakes the fall and lets it settle onto the waterline.
  return vy + (BREATH.settle - vy) * Math.min(1, BREATH.float * dt);
}
