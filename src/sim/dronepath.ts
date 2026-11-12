/**
 * Drone pathing: a bounded A* over open (non-solid) tiles so field drones fly around rock instead
 * of phasing through it. Pure and deterministic; the search is capped so a far or sealed goal costs
 * at most PATH_NODES expansions, after which the caller falls back to straight flight.
 */
import type { World } from './world';
import { TILES } from './tiles';

export const PATH_NODES = 300;
/** Seconds between re-plans while a drone follows a path (the player and the world move). */
export const REPATH_S = 0.5;

export interface Pt {
  x: number;
  y: number;
}

function open(world: World, x: number, y: number): boolean {
  return !TILES[world.get(x, y)].solid;
}

/** True when the segment from a to b crosses only open tiles (sampled every 0.2 tiles). */
export function clearLine(world: World, ax: number, ay: number, bx: number, by: number): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.2));
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    if (!open(world, Math.floor(ax + (bx - ax) * k), Math.floor(ay + (by - ay) * k))) return false;
  }
  return true;
}

const DIRS: readonly [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

const EXITS: readonly [number, number][] = [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];

/**
 * Path of open cell centres from (sx, sy) toward (gx, gy). The goal cell, or (when the goal cell is
 * solid, e.g. a bay block) any open cell touching it, ends the search. Diagonals never cut corners.
 * A start inside a solid tile steps out to an open neighbour first (that step is the first waypoint).
 * Returns null when the start is buried or nothing is found within `maxNodes` expansions.
 * The returned list excludes the start cell; an empty list means start and goal share a cell.
 */
export function findPath(world: World, sx: number, sy: number, gx: number, gy: number, maxNodes = PATH_NODES): Pt[] | null {
  let x0 = Math.floor(sx);
  let y0 = Math.floor(sy);
  const gcx = Math.floor(gx);
  const gcy = Math.floor(gy);
  // Leaving a dock (or a just-placed block): step out to the first open neighbour, up first.
  let exit: Pt | null = null;
  if (!open(world, x0, y0)) {
    const n = EXITS.find(([dx, dy]) => open(world, x0 + dx, y0 + dy));
    if (!n) return null;
    x0 += n[0];
    y0 += n[1];
    exit = { x: x0 + 0.5, y: y0 + 0.5 };
  }
  const goalSolid = !open(world, gcx, gcy);
  const isGoal = (x: number, y: number): boolean =>
    goalSolid ? Math.abs(x - gcx) <= 1 && Math.abs(y - gcy) <= 1 : x === gcx && y === gcy;
  const h = (x: number, y: number): number => {
    const dx = Math.abs(x - gcx);
    const dy = Math.abs(y - gcy);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  const key = (x: number, y: number): string => x + ',' + y;
  const g = new Map<string, number>([[key(x0, y0), 0]]);
  const parent = new Map<string, string>();
  const closed = new Set<string>();
  // Small open list scanned linearly: with a 300-node cap this beats a heap and stays deterministic.
  const openList: { x: number; y: number; f: number; g: number }[] = [{ x: x0, y: y0, f: h(x0, y0), g: 0 }];
  let expanded = 0;
  while (openList.length > 0 && expanded < maxNodes) {
    let bi = 0;
    for (let i = 1; i < openList.length; i++) {
      const a = openList[i];
      const b = openList[bi];
      if (a.f < b.f - 1e-9 || (Math.abs(a.f - b.f) <= 1e-9 && a.g > b.g)) bi = i;
    }
    const cur = openList.splice(bi, 1)[0];
    const ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue;
    closed.add(ck);
    expanded++;
    if (isGoal(cur.x, cur.y)) {
      const out: Pt[] = [];
      let k: string | undefined = ck;
      while (k && k !== key(x0, y0)) {
        const [x, y] = k.split(',').map(Number);
        out.push({ x: x + 0.5, y: y + 0.5 });
        k = parent.get(k);
      }
      out.reverse();
      if (exit) out.unshift(exit);
      return out;
    }
    for (const [dx, dy, cost] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!open(world, nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (!open(world, cur.x + dx, cur.y) || !open(world, cur.x, cur.y + dy))) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const ng = cur.g + cost;
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        parent.set(nk, ck);
        openList.push({ x: nx, y: ny, g: ng, f: ng + h(nx, ny) });
      }
    }
  }
  return null;
}
