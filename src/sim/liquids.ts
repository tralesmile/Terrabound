/**
 * Liquids (coolant water, acid, magma) with levels: each liquid cell holds 1..FULL sixteenths
 * (World.fill, 0 = full). Deterministic flow, run only in a window around the player at LIQUID_HZ.
 * Volume (the sum of levels) is conserved exactly: mass moves between cells in whole units.
 *
 * Rules per liquid cell, scanning bottom-up:
 *  1. Fall: pour as much as fits into the cell below (air or the same liquid).
 *  2. Spread: share with a lower neighbour (air or the same liquid) when the difference is 2 or more.
 *     Into empty floor only from MIN_SPREAD up, so puddles keep a visible depth instead of a 1 px film.
 *  3. Level: a surface cell looks along its row (through the same liquid or air, up to FLOW_REACH) for a
 *     spot 2+ lower, or a drop, and moves one unit there, so wide pools settle flat within one unit.
 * Settled pools stop changing (every rule needs a difference of 2), so nothing jitters.
 */
import { T, TILES } from './tiles';
import type { World } from './world';

export const LIQUID_HZ = 10;
export const FLOW_RX = 48;
export const FLOW_RY = 32;
/** How far a surface cell looks along its row for a lower spot. */
export const FLOW_REACH = 32;

export function isLiquid(t: number): boolean {
  return TILES[t]?.liquid === true;
}

/**
 * Water meeting magma: the magma cell cools into basalt and the touching water flashes to steam
 * (becomes air). Returns the cooled cells so the game can hiss and puff. Deterministic scan order.
 */
export function coolMagma(world: World, cx: number, cy: number, rx = FLOW_RX, ry = FLOW_RY): { x: number; y: number }[] {
  const x0 = Math.max(1, Math.floor(cx - rx));
  const x1 = Math.min(world.w - 2, Math.floor(cx + rx));
  const y0 = Math.max(1, Math.floor(cy - ry));
  const y1 = Math.min(world.h - 2, Math.floor(cy + ry));
  const out: { x: number; y: number }[] = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (world.get(x, y) !== T.MAGMA) continue;
      let hit = false;
      for (const [dx, dy] of NEIGHBOURS) {
        if (world.get(x + dx, y + dy) === T.WATER) {
          world.set(x + dx, y + dy, T.AIR);
          hit = true;
        }
      }
      if (hit) {
        world.set(x, y, T.BASALT);
        out.push({ x, y });
      }
    }
  }
  return out;
}

const NEIGHBOURS: [number, number][] = [[0, -1], [-1, 0], [1, 0], [0, 1]];

/** Full cell, in level units. */
export const FULL = 16;
/** Smallest level that spreads onto an empty floor cell. */
export const MIN_SPREAD = 4;
/** Level a cell needs before the player counts as swimming in it. */
export const SWIM_LEVEL = 8;

/** Level of liquid in a cell (0 for non-liquid). */
export function levelAt(world: World, x: number, y: number): number {
  if (!isLiquid(world.get(x, y))) return 0;
  const f = world.fill[y * world.w + x];
  return f === 0 ? FULL : f;
}

/** Set a cell's liquid level; 0 empties it to air. Tile changes go through set() (edits, chunks, light). */
function setLevel(world: World, x: number, y: number, t: number, a: number): void {
  if (a <= 0) {
    if (world.get(x, y) !== T.AIR) world.set(x, y, T.AIR);
    return;
  }
  if (world.get(x, y) !== t) world.set(x, y, t);
  world.fill[y * world.w + x] = a >= FULL ? 0 : a;
}

/** Total liquid volume of one kind in a world (tests, persistence). */
export function volumeOf(world: World, t: number): number {
  let v = 0;
  for (let i = 0; i < world.tiles.length; i++) if (world.tiles[i] === t) v += world.fill[i] === 0 ? FULL : world.fill[i];
  return v;
}

/** One flow tick in the window around (cx, cy). Returns the number of level units moved. */
export function flowLiquids(world: World, cx: number, cy: number, tick: number, rx = FLOW_RX, ry = FLOW_RY): number {
  const x0 = Math.max(1, Math.floor(cx - rx));
  const x1 = Math.min(world.w - 2, Math.floor(cx + rx));
  const y0 = Math.max(1, Math.floor(cy - ry));
  const y1 = Math.min(world.h - 3, Math.floor(cy + ry));
  // A cell liquid `t` may enter: air or the same liquid (other liquids and solids are walls).
  const open = (x: number, y: number, t: number): boolean => {
    const c = world.get(x, y);
    return c === T.AIR || c === t;
  };
  // Supported: the cell below is solid or a full cell of liquid.
  const resting = (x: number, y: number): boolean => {
    const c = world.get(x, y + 1);
    return TILES[c].solid || (isLiquid(c) && levelAt(world, x, y + 1) === FULL);
  };
  // Alternate scan direction per tick so flow is not biased to one side.
  const ltr = (tick & 1) === 0;
  let moved = 0;
  for (let y = y1; y >= y0; y--) {
    for (let k = 0; k <= x1 - x0; k++) {
      const x = ltr ? x0 + k : x1 - k;
      const t = world.get(x, y);
      if (!isLiquid(t)) continue;
      let a = levelAt(world, x, y);
      const start = a;
      // 1. Fall.
      if (open(x, y + 1, t)) {
        const below = levelAt(world, x, y + 1);
        const m = Math.min(a, FULL - below);
        if (m > 0) {
          setLevel(world, x, y + 1, t, below + m);
          a -= m;
        }
      }
      // Anything left rests on a full or blocked cell. Magma is viscous: it spreads every other tick pair.
      if (a > 0 && !(t === T.MAGMA && tick & 2)) {
        // 2. Spread to lower neighbours.
        const first = ((x + y + tick) & 1) === 0 ? 1 : -1;
        for (const dir of [first, -first]) {
          const n = x + dir;
          if (!open(n, y, t)) continue;
          const na = levelAt(world, n, y);
          if (na === 0 && a < MIN_SPREAD) continue;
          if (a - na >= 2) {
            const m = Math.max(1, Math.floor((a - na) / 3));
            setLevel(world, n, y, t, na + m);
            a -= m;
          }
        }
        // 3. Level along the row from a surface cell.
        if (a === start && world.get(x, y - 1) !== t) {
          let dest = -1;
          for (const dir of [first, -first]) {
            for (let j = 1; j <= FLOW_REACH; j++) {
              const sx = x + dir * j;
              if (!open(sx, y, t)) break;
              const sa = levelAt(world, sx, y);
              if (sa === 0 && world.get(sx, y + 1) === T.AIR) {
                dest = sx;
                break;
              }
              if (sa <= a - 2 && (sa > 0 || a >= MIN_SPREAD) && resting(sx, y)) {
                dest = sx;
                break;
              }
            }
            if (dest >= 0) break;
          }
          if (dest >= 0) {
            setLevel(world, dest, y, t, levelAt(world, dest, y) + 1);
            a -= 1;
          }
        }
      }
      if (a !== start) {
        moved += start - a;
        setLevel(world, x, y, t, a);
      }
    }
  }
  return moved;
}
