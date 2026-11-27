/**
 * The ceiling lurker (P12-B): it hangs from a roof, shakes when you walk under it, drops, and lies
 * stunned for a moment. Counter: look up, step aside after the shake, and strike while it is dazed.
 * Pure and deterministic.
 */
import type { World } from './world';
import type { Enemy } from './enemies';

export const LURK = {
  /** Half-width of the strip under it that wakes it (tiles). */
  reachX: 1.1,
  /** How far below it can notice the player (tiles). */
  reachY: 9,
  /** Seconds of trembling before it lets go (at least the 0.4 s telegraph rule). */
  shake: 0.6,
  /** Seconds it lies dazed and harmless after landing. */
  stun: 0.8,
  /** Fall acceleration and top speed (tiles/s). */
  gravity: 46,
  maxFall: 20,
  /** Open rows a perch needs under the roof. */
  room: 3,
} as const;

/** True while it cannot hurt: asleep on the roof, shaking, or dazed on the floor. */
export function ambushHarmless(e: Enemy): boolean {
  return e.hang === true || (e.stunT ?? 0) > 0;
}

/** The row it would hang under in column tx, looking up from ty, or null if there is no good perch. */
export function ceilingPerch(world: World, tx: number, ty: number, look = 8): number | null {
  if (world.isSolid(tx, ty)) return null;
  for (let y = ty; y > ty - look && y > 1; y--) {
    if (!world.isSolid(tx, y - 1)) continue;
    for (let k = 0; k < LURK.room; k++) if (world.isSolid(tx, y + k)) return null;
    return y;
  }
  return null;
}

function openBelow(world: World, x: number, from: number, to: number): boolean {
  for (let y = Math.floor(from); y <= Math.floor(to); y++) if (world.isSolid(Math.floor(x), y)) return false;
  return true;
}

/**
 * Advance the hanging, shaking and dazed states. Returns true while they hold it in place; false once
 * it should move like any other creature (falling, or walking after the daze).
 */
export function stepAmbush(world: World, e: Enemy, h: number, maxHp: number, dt: number, px: number, py: number): boolean {
  if ((e.stunT ?? 0) > 0) {
    e.stunT = Math.max(0, (e.stunT ?? 0) - dt);
    e.vx = 0;
    return true;
  }
  if (!e.hang) return false;
  e.vx = 0;
  e.vy = 0;
  const top = e.y - h;
  const perched = world.isSolid(Math.floor(e.x), Math.floor(top - 0.05));
  const under = py - top;
  const sees = Math.abs(px - e.x) <= LURK.reachX && under > 0.5 && under <= LURK.reachY && openBelow(world, e.x, e.y, py - 1);
  if (e.dropT === undefined && sees) {
    e.dropT = 0;
    e.woke = true;
  }
  if (e.dropT !== undefined) e.dropT += dt;
  // Digging out its perch or hurting it shakes it loose at once.
  if (!perched || e.hp < maxHp || (e.dropT ?? 0) >= LURK.shake) {
    e.hang = false;
    e.dropT = undefined;
    e.falling = true;
    return false;
  }
  return true;
}
