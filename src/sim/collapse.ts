/**
 * Telegraphed ceiling collapse (P12-A): deep in the Plasma and Core layers the cave roof above the player
 * sometimes shakes loose. A chosen roof block trickles dust for a full second (a dodgeable telegraph),
 * then drops as a falling body (falling.ts) and lands as rubble you can dig. Pure and deterministic:
 * all randomness comes from the sim rng that is passed in.
 */
import type { World } from './world';
import { LAYERS } from './layers';

export const COLLAPSE = {
  /** Depth (tiles under the pad) where roofs start to give way: the Plasma layer. */
  minDepth: 180,
  /** Seconds of dust before the block drops. */
  warn: 1.0,
  /** Seconds between collapses (scaled by a random factor). */
  period: 16,
  /** Horizontal reach around the player and how far up a roof is looked for (tiles). */
  reach: 5,
  up: 9,
  /** Open air required under the roof block so the player has room to step away. */
  room: 3,
};

export interface CollapseWarn {
  x: number;
  y: number;
  t: number;
}

/** Plain layer rock only: ores, structures and decor never fall. */
const ROCK: ReadonlySet<number> = new Set<number>(LAYERS.map((l) => l.rock));

/** Find the lowest roof block above (px, py) in column x: rock with open air of at least `room` tiles under it. */
export function roofAt(world: World, x: number, py: number): number {
  for (let y = Math.floor(py) - 1; y >= Math.max(1, Math.floor(py) - COLLAPSE.up); y--) {
    if (!world.isSolid(x, y)) continue;
    if (!ROCK.has(world.get(x, y))) return -1;
    for (let k = 1; k <= COLLAPSE.room; k++) if (world.isSolid(x, y + k)) return -1;
    return y;
  }
  return -1;
}

/** Choose a roof block near the player, or null when the cave has no suitable roof. */
export function pickCollapse(world: World, rng: () => number, px: number, py: number): { x: number; y: number } | null {
  const x = Math.floor(px + (rng() * 2 - 1) * COLLAPSE.reach);
  const y = roofAt(world, x, py);
  return y < 0 ? null : { x, y };
}

/** Advance warnings; returns the blocks whose telegraph ended and that are still a valid roof (they now drop). */
export function stepCollapse(world: World, warns: CollapseWarn[], dt: number): Array<{ x: number; y: number; tile: number }> {
  const out: Array<{ x: number; y: number; tile: number }> = [];
  for (let i = warns.length - 1; i >= 0; i--) {
    const w = warns[i];
    w.t -= dt;
    if (w.t > 0) continue;
    warns.splice(i, 1);
    const tile = world.get(w.x, w.y);
    if (ROCK.has(tile) && !world.isSolid(w.x, w.y + 1)) out.push({ x: w.x, y: w.y, tile });
  }
  return out;
}

export const isCollapseDepth = (depth: number): boolean => depth >= COLLAPSE.minDepth;
