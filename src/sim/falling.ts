/**
 * Falling blocks (P12-A): crystal sand and ash are loose. Dig out what holds them up and they wobble for a
 * moment (a telegraph: grains trickle), then drop, pile up where they land, and can bring the next loose
 * block above down with them. A falling block that lands on the player hurts a little and breaks into a
 * pickup instead of burying them. Worldgen overhangs stay put until disturbed. Pure and deterministic.
 */
import type { World } from './world';
import { T } from './tiles';

/** Loose tiles that fall when the block under them is removed. */
export const FALLS: ReadonlySet<number> = new Set<number>([T.SAND, T.ASH]);

export const FALL = {
  /** Wobble seconds before a loose block drops (the 0.4 s telegraph rule). */
  warn: 0.45,
  /** Gravity and terminal speed (tiles/s^2, tiles/s). */
  g: 40,
  maxV: 22,
  /** Damage when one lands on the player. */
  dmg: 8,
};

/** A loose block still in the world, about to drop. */
export interface FallWarn {
  x: number;
  y: number;
  t: number;
}

/** A block in flight: column x, top edge y (tiles, float). */
export interface FallBody {
  x: number;
  y: number;
  vy: number;
  tile: number;
}

export interface FallStep {
  /** Blocks that left the world this step (start of the drop). */
  started: Array<{ x: number; y: number; tile: number }>;
  /** Blocks that came to rest (placed back into the world at x, y). */
  landed: Array<{ x: number; y: number; tile: number }>;
  /** Blocks that broke on something they could not rest in (the player, a torch): they become pickups. */
  broke: Array<{ x: number; y: number; tile: number; player: boolean }>;
  /** New warnings raised by this step's drops (the block above a falling one). */
  warned: Array<{ x: number; y: number }>;
}

const open = (world: World, x: number, y: number): boolean => y < world.h - 1 && !world.isSolid(x, y);

/** If the block above (x, y) is loose and has nothing under it, start its wobble. Returns true when warned. */
export function disturb(world: World, x: number, y: number, warns: FallWarn[]): boolean {
  const ay = y - 1;
  if (ay < 1 || !FALLS.has(world.get(x, ay)) || !open(world, x, y)) return false;
  if (warns.some((w) => w.x === x && w.y === ay)) return false;
  warns.push({ x, y: ay, t: FALL.warn });
  return true;
}

/**
 * Advance warnings and falling blocks. `hitsPlayer(x, y)` says whether a block with top-left (x, y)
 * overlaps the player. Mutates the world, `warns` and `bodies`.
 */
export function stepFalling(world: World, warns: FallWarn[], bodies: FallBody[], dt: number, hitsPlayer: (x: number, y: number) => boolean): FallStep {
  const out: FallStep = { started: [], landed: [], broke: [], warned: [] };
  for (let i = warns.length - 1; i >= 0; i--) {
    const w = warns[i];
    w.t -= dt;
    if (w.t > 0) continue;
    warns.splice(i, 1);
    const tile = world.get(w.x, w.y);
    // Dug out during the wobble, or something solid was built under it: nothing falls.
    if (!FALLS.has(tile) || !open(world, w.x, w.y + 1)) continue;
    world.set(w.x, w.y, T.AIR);
    bodies.push({ x: w.x, y: w.y, vy: 0, tile });
    out.started.push({ x: w.x, y: w.y, tile });
    if (disturb(world, w.x, w.y, warns)) out.warned.push({ x: w.x, y: w.y - 1 });
  }
  for (let i = bodies.length - 1; i >= 0; i--) {
    const b = bodies[i];
    b.vy = Math.min(FALL.maxV, b.vy + FALL.g * dt);
    let ny = b.y + b.vy * dt;
    // Rest on the first solid cell under the block's bottom edge (or the world floor).
    const below = Math.floor(ny + 1);
    const rest = !open(world, b.x, below);
    if (rest) ny = below - 1;
    if (hitsPlayer(b.x, ny)) {
      bodies.splice(i, 1);
      out.broke.push({ x: b.x, y: ny, tile: b.tile, player: true });
      continue;
    }
    b.y = ny;
    if (!rest) continue;
    bodies.splice(i, 1);
    const cy = Math.round(ny);
    const here = world.get(b.x, cy);
    // Only open air takes the block; landing in water, on a torch or a plant breaks it into a pickup.
    if (here === T.AIR) {
      world.set(b.x, cy, b.tile);
      out.landed.push({ x: b.x, y: cy, tile: b.tile });
    } else out.broke.push({ x: b.x, y: cy, tile: b.tile, player: false });
  }
  return out;
}
