/**
 * Whole-tile liquids (coolant water, acid). Deterministic cellular flow, run only in a window around the
 * player at LIQUID_HZ. Volume is conserved: cells move (swap with air), never duplicate or vanish.
 *
 * Rules per liquid cell, scanning bottom-up:
 *  1. Air below: fall.
 *  2. Look along the row (up to FLOW_REACH cells, through air only) for a cell with air below and move
 *     there: puddles run to holes and stepped surfaces level out. Only strictly lower spots count, so
 *     settled pools stop changing (no jitter).
 *  3. Liquid above (under pressure) and air beside on support: push sideways; the cell above falls in.
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

/** One flow tick in the window around (cx, cy). Returns the number of cells moved. */
export function flowLiquids(world: World, cx: number, cy: number, tick: number, rx = FLOW_RX, ry = FLOW_RY): number {
  const x0 = Math.max(1, Math.floor(cx - rx));
  const x1 = Math.min(world.w - 2, Math.floor(cx + rx));
  const y0 = Math.max(1, Math.floor(cy - ry));
  const y1 = Math.min(world.h - 3, Math.floor(cy + ry));
  const air = (x: number, y: number): boolean => world.get(x, y) === T.AIR;
  const supported = (x: number, y: number): boolean => {
    const t = world.get(x, y + 1);
    return TILES[t].solid || isLiquid(t);
  };
  // Alternate scan direction per tick so flow is not biased to one side.
  const ltr = (tick & 1) === 0;
  let moved = 0;
  // Cells that already moved this tick (so a cell cannot race along a row in one tick).
  const done = new Set<number>();
  for (let y = y1; y >= y0; y--) {
    for (let k = 0; k <= x1 - x0; k++) {
      const x = ltr ? x0 + k : x1 - k;
      const t = world.get(x, y);
      if (!isLiquid(t) || done.has(y * world.w + x)) continue;
      if (air(x, y + 1)) {
        world.set(x, y + 1, t);
        world.set(x, y, T.AIR);
        moved++;
        continue;
      }
      const first = ((x + y + tick) & 1) === 0 ? 1 : -1;
      const pressured = isLiquid(world.get(x, y - 1));
      let dest = -1;
      for (const dir of [first, -first]) {
        // Run along the row over the pool surface (or a flat floor) to the nearest drop, up to FLOW_REACH.
        for (let k = 1; k <= FLOW_REACH; k++) {
          const sx = x + dir * k;
          if (!air(sx, y)) break;
          if (air(sx, y + 1)) {
            dest = sx;
            break;
          }
          // Under pressure, push into the first free cell at this level (the cell above then falls in).
          if (pressured && k === 1 && supported(sx, y)) {
            dest = sx;
            break;
          }
        }
        if (dest >= 0) break;
      }
      if (dest >= 0) {
        world.set(dest, y, t);
        world.set(x, y, T.AIR);
        done.add(y * world.w + dest);
        moved++;
      }
    }
  }
  return moved;
}
