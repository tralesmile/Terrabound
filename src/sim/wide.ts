/**
 * Two-tile furniture (P1.8 furniture follow-ups): the bed and the table take two cells side by side.
 * The left cell keeps the item's tile (T.BED, T.TABLE); the right cell is its partner (T.BED_FOOT,
 * T.TABLE_END). Placing puts both down for one item; breaking either half removes both and drops
 * one item. A bed or table with no room beside it still goes down as a single tile (old saves keep
 * their 1-tile furniture). Pure and deterministic.
 */
import { T, TILES } from './tiles';
import type { World } from './world';

/** Left-half tile -> right-half tile. */
export const WIDE: Readonly<Record<number, number>> = { [T.BED]: T.BED_FOOT, [T.TABLE]: T.TABLE_END };
const HEAD_OF: Readonly<Record<number, number>> = { [T.BED_FOOT]: T.BED, [T.TABLE_END]: T.TABLE };

export interface Cell {
  x: number;
  y: number;
  tile: number;
}

/**
 * Cells to fill when placing `tile` aimed at (x, y). For a wide piece: the aimed cell plus the free
 * cell to its right (or, failing that, to its left), as [left half, right half]. `free` says whether
 * the extra cell may be used (empty and not overlapping the player). Falls back to one tile. Pure.
 */
export function placement(world: World, x: number, y: number, tile: number, free: (x: number, y: number) => boolean): Cell[] {
  const foot = WIDE[tile];
  if (foot === undefined) return [{ x, y, tile }];
  const open = (cx: number): boolean => world.get(cx, y) === T.AIR && free(cx, y);
  if (open(x + 1)) return [{ x, y, tile }, { x: x + 1, y, tile: foot }];
  if (open(x - 1)) return [{ x: x - 1, y, tile }, { x, y, tile: foot }];
  return [{ x, y, tile }];
}

/** The other half of a wide piece at (x, y), or null for single tiles and orphans. Pure. */
export function partner(world: World, x: number, y: number): { x: number; y: number } | null {
  const t = world.get(x, y);
  const foot = WIDE[t];
  if (foot !== undefined) return world.get(x + 1, y) === foot ? { x: x + 1, y } : null;
  const head = HEAD_OF[t];
  if (head !== undefined) return world.get(x - 1, y) === head ? { x: x - 1, y } : null;
  return null;
}

/**
 * Removes the tile at (x, y) and, for a wide piece, its other half. Returns the item the piece
 * drops (one for the whole piece) and the partner cell that was cleared, if any.
 */
export function removeTile(world: World, x: number, y: number): { drop: ReturnType<typeof dropOf>; other: { x: number; y: number } | null } {
  const drop = dropOf(world.get(x, y));
  const other = partner(world, x, y);
  world.set(x, y, T.AIR);
  if (other) world.set(other.x, other.y, T.AIR);
  return { drop, other };
}

function dropOf(t: number): (typeof TILES)[number]['drop'] {
  return TILES[t].drop;
}

/** Whether (x, y)'s wide piece is the half drawn with the left (head) art, right art, or single. */
export function wideSide(world: World, x: number, y: number): 'left' | 'right' | null {
  const t = world.get(x, y);
  if (WIDE[t] !== undefined) return partner(world, x, y) ? 'left' : null;
  if (HEAD_OF[t] !== undefined) return partner(world, x, y) ? 'right' : null;
  return null;
}
