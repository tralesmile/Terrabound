/**
 * Furniture and house "rooms" (P1.8). A room is an enclosed pocket of open cells (walled by solid
 * blocks, doors or platforms) in the base. It is a valid home for a robot NPC when it holds a light,
 * a table and a bed. Decorations (screens, plants, banners, back walls) raise its comfort, which
 * robot NPCs will use for happiness. Pure and deterministic.
 */
import { BASE_HALF, BASE_ROWS } from './base';
import { T, TILES } from './tiles';
import type { World } from './world';

/** Smallest and largest room in cells (a 3x4 nook up to a big hall). */
export const ROOM_MIN = 12;
export const ROOM_MAX = 80;

/** Placeable furniture tiles (non-solid, minable). The bed and table go down 2 tiles wide (wide.ts). */
export const FURNITURE: ReadonlySet<number> = new Set<number>([T.TABLE, T.LAMP, T.SCREEN, T.POT_PLANT, T.BANNER, T.BED, T.CHAIR]);
/** Tiles that light a room. */
export const ROOM_LIGHTS: ReadonlySet<number> = new Set<number>([T.TORCH, T.LAMP]);
/** Decorations that add comfort (one point per kind). */
export const DECOR: readonly number[] = [T.SCREEN, T.POT_PLANT, T.BANNER, T.CHAIR];
/** Highest comfort score. */
export const COMFORT_MAX = 4;

export interface Room {
  /** Cell indices (y * w + x), in fill order. */
  cells: number[];
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  light: boolean;
  table: boolean;
  bed: boolean;
  /** 0..4: one per decoration kind, one when at least half the room has a back wall, one for a window. */
  comfort: number;
  /** A window in the room's walls. */
  view: boolean;
  valid: boolean;
  /** What a valid room still needs, in plain words ("a bed", "a light"). */
  missing: string[];
}

/** Doors, platforms and lift shafts close a room like walls do. */
function bounds(t: number): boolean {
  return TILES[t].solid || t === T.DOOR || t === T.PLATFORM || t === T.LIFT;
}

/** Furniture that hangs on a wall: it needs a back wall behind it, or a block above or beside it. */
export const WALL_MOUNTED: ReadonlySet<number> = new Set<number>([T.SCREEN, T.BANNER]);

/**
 * Whether `tile` may go at (x, y) as far as mounting goes: wall-mounted pieces need a back wall
 * in that cell or a solid block above, left or right (a floor alone is not enough). Pure.
 */
export function mountOk(world: World, x: number, y: number, tile: number): boolean {
  if (!WALL_MOUNTED.has(tile)) return true;
  return world.wall(x, y) !== 0 || world.isSolid(x, y - 1) || world.isSolid(x - 1, y) || world.isSolid(x + 1, y);
}

/**
 * The room containing (x, y), or null when the cell is a wall or the pocket is not enclosed
 * (it leaks to the sky or grows past ROOM_MAX). 4-way flood fill, bounded. Pure.
 */
export function roomAt(world: World, x: number, y: number): Room | null {
  if (x < 0 || x >= world.w || y < 0 || y >= world.h || bounds(world.get(x, y))) return null;
  const seen = new Set<number>();
  const stack = [y * world.w + x];
  const cells: number[] = [];
  let view = false;
  seen.add(stack[0]);
  while (stack.length) {
    const i = stack.pop() as number;
    cells.push(i);
    if (cells.length > ROOM_MAX) return null;
    const cx = i % world.w;
    const cy = Math.floor(i / world.w);
    for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]] as const) {
      // Leaking off the top of the world (open sky) or off the sides means it is not enclosed.
      if (ny < 0 || nx < 0 || nx >= world.w) return null;
      const ni = ny * world.w + nx;
      const nt = world.get(nx, ny);
      if (nt === T.WINDOW) view = true;
      if (seen.has(ni) || bounds(nt)) continue;
      seen.add(ni);
      stack.push(ni);
    }
  }
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let light = false;
  let table = false;
  let bed = false;
  let walls = 0;
  const decor = new Set<number>();
  for (const i of cells) {
    const cx = i % world.w;
    const cy = Math.floor(i / world.w);
    x0 = Math.min(x0, cx);
    y0 = Math.min(y0, cy);
    x1 = Math.max(x1, cx);
    y1 = Math.max(y1, cy);
    const t = world.tiles[i];
    if (ROOM_LIGHTS.has(t)) light = true;
    if (t === T.TABLE || t === T.TABLE_END) table = true;
    if (t === T.BED || t === T.BED_FOOT) bed = true;
    if (DECOR.includes(t)) decor.add(t);
    if (world.wall(cx, cy) !== 0) walls++;
  }
  const comfort = Math.min(COMFORT_MAX, decor.size + (walls * 2 >= cells.length ? 1 : 0) + (view ? 1 : 0));
  const missing: string[] = [];
  if (cells.length < ROOM_MIN) missing.push('more space');
  if (!light) missing.push('a light');
  if (!table) missing.push('a table');
  if (!bed) missing.push('a bed');
  return { cells, x0, y0, x1, y1, light, table, bed, comfort, view, valid: missing.length === 0, missing };
}

/** Every distinct enclosed room with a cell in the base strip (scan order: top-left first). Pure. */
export function findRooms(world: World): Room[] {
  const out: Room[] = [];
  const claimed = new Set<number>();
  for (let dy = BASE_ROWS; dy >= 1; dy--) {
    for (let dx = -BASE_HALF; dx <= BASE_HALF; dx++) {
      const x = world.padX + dx;
      const y = world.padY - dy;
      const i = y * world.w + x;
      if (claimed.has(i)) continue;
      const r = roomAt(world, x, y);
      if (!r) continue;
      for (const c of r.cells) claimed.add(c);
      out.push(r);
    }
  }
  return out;
}

/** One-line hint for the player standing in a room (null outside rooms). Pure. */
export function roomHint(r: Room | null): string | null {
  if (!r) return null;
  if (r.valid) return `Room ready: a robot can move in here (comfort ${r.comfort}/${COMFORT_MAX})`;
  return `Room: needs ${r.missing.join(', ')} (Fabricator)`;
}

/**
 * Outline of a room as unit edges on its border: horizontal edges (`h`) run along the top of cell
 * (x, y), vertical edges (`v`) along its left side. The renderer strokes these. Pure.
 */
export function roomEdges(r: Room, w: number): { h: [number, number][]; v: [number, number][] } {
  const set = new Set(r.cells);
  const h: [number, number][] = [];
  const v: [number, number][] = [];
  for (const i of r.cells) {
    const x = i % w;
    const y = Math.floor(i / w);
    if (!set.has(i - w)) h.push([x, y]);
    if (!set.has(i + w)) h.push([x, y + 1]);
    if (x === 0 || !set.has(i - 1)) v.push([x, y]);
    if (x === w - 1 || !set.has(i + 1)) v.push([x + 1, y]);
  }
  return { h, v };
}
