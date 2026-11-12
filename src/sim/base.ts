import { T } from './tiles';
import { W, type World } from './world';

/** The persistent base is the strip of sky above the landing pad: tiles built here survive every dive. */
/** Run 25 widened the strip from 15 x 10 to 33 x 16 so four or more robot rooms fit (two floors side by side). */
export const BASE_HALF = 16;
export const BASE_ROWS = 16;
/** Flat list of triples: dx (from pad centre), dy (rows above the pad, 1 = just above), tile id. */
export type BaseTiles = number[];

/** T.WALL is legacy (v2 saves stored back walls as tiles); v3 keeps them in the wall layer. */
export const BASE_KEEP: ReadonlySet<number> = new Set<number>([T.RUST, T.METAL, T.TORCH, T.LADDER, T.SCAFFOLD, T.PLATFORM, T.DOOR, T.SOLAR, T.SMELTER, T.BATTERY, T.MINER, T.DRONE, T.TURRET, T.SPIKES, T.REINFORCED, T.SHIELD, T.TABLE, T.LAMP, T.SCREEN, T.POT_PLANT, T.BANNER, T.BED, T.BED_FOOT, T.TABLE_END, T.CHAIR, T.WINDOW, T.LIFT, T.SPRINKLER, T.POT]);
const KEEP_WALLS = new Set<number>([W.PLATE]);
export const BASE_MAX_TILES = (BASE_HALF * 2 + 1) * BASE_ROWS;

/**
 * Whether the tile at (x, y) was put there after generation (built by the player, or stamped from
 * the saved base). The wide strip reaches over natural hills, and their rust must never count as
 * base: it would follow the player into a new world, swell raids and get chewed. Pure.
 */
export function isBuilt(world: World, x: number, y: number): boolean {
  return x >= 0 && x < world.w && y >= 0 && y < world.h && world.edits.has(y * world.w + x);
}

export function captureBase(world: World): BaseTiles {
  const out: BaseTiles = [];
  for (let dy = 1; dy <= BASE_ROWS; dy++) {
    for (let dx = -BASE_HALF; dx <= BASE_HALF; dx++) {
      const x = world.padX + dx;
      const y = world.padY - dy;
      const t = world.get(x, y);
      if (BASE_KEEP.has(t) && isBuilt(world, x, y)) out.push(dx, dy, t);
    }
  }
  return out;
}

export function stampBase(world: World, base: BaseTiles): void {
  for (let i = 0; i + 2 < base.length; i += 3) {
    const x = world.padX + base[i];
    const y = world.padY - base[i + 1];
    if (world.get(x, y) === T.AIR) world.set(x, y, base[i + 2]);
  }
}

/** Player-built back walls in the base strip, same triple format (wall id instead of tile id). */
export function captureWalls(world: World): BaseTiles {
  const out: BaseTiles = [];
  for (let dy = 1; dy <= BASE_ROWS; dy++) {
    for (let dx = -BASE_HALF; dx <= BASE_HALF; dx++) {
      const wl = world.wall(world.padX + dx, world.padY - dy);
      if (KEEP_WALLS.has(wl)) out.push(dx, dy, wl);
    }
  }
  return out;
}

export function stampWalls(world: World, walls: BaseTiles): void {
  for (let i = 0; i + 2 < walls.length; i += 3) world.setWall(world.padX + walls[i], world.padY - walls[i + 1], walls[i + 2]);
}

export function sanitizeWalls(v: unknown): BaseTiles {
  return sanitizeTriples(v, KEEP_WALLS);
}

/** v2 -> v3: back walls were tiles in `base`; returns them as wall-layer triples. Never throws. */
export function legacyWalls(v: unknown): BaseTiles {
  if (!Array.isArray(v)) return [];
  const out: number[] = [];
  for (let i = 0; i + 2 < v.length; i += 3) if (v[i + 2] === T.WALL) out.push(v[i], v[i + 1], W.PLATE);
  return sanitizeWalls(out);
}

/** Never throws; drops anything out of range or not a keepable tile; dedupes cells. */
export function sanitizeBase(v: unknown): BaseTiles {
  return sanitizeTriples(v, BASE_KEEP);
}

function sanitizeTriples(v: unknown, keep: ReadonlySet<number>): BaseTiles {
  if (!Array.isArray(v)) return [];
  const seen = new Set<number>();
  const out: BaseTiles = [];
  for (let i = 0; i + 2 < v.length && out.length < BASE_MAX_TILES * 3; i += 3) {
    const dx = v[i];
    const dy = v[i + 1];
    const t = v[i + 2];
    if (!Number.isInteger(dx) || !Number.isInteger(dy) || !Number.isInteger(t)) continue;
    if (Math.abs(dx) > BASE_HALF || dy < 1 || dy > BASE_ROWS || !keep.has(t)) continue;
    const key = dy * 100 + dx + 50;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(dx, dy, t);
  }
  return out;
}
