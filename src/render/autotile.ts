/**
 * Autotiling: pure helpers (no DOM) that decide how a block's edges look from its 4 neighbours.
 * A set bit means that side is exposed (the neighbour is open), so the edge gets an outline
 * and a light (top/left) or shade (bottom/right) row, and exposed corners are rounded off.
 */
import { T } from '../sim/tiles';

export const EDGE_N = 1;
export const EDGE_E = 2;
export const EDGE_S = 4;
export const EDGE_W = 8;
export const MASKS = 16;

/** Tiles that merge into one continuous mass (no seam between them). */
const BLOCKS = new Set<number>([T.RUST, T.METAL, T.IRON, T.COPPER, T.BEDROCK, T.PAD, T.SCAFFOLD, T.SOIL, T.ASH, T.FROST, T.SAND, T.CRYSTAL, T.RUIN, T.WRECK, T.CIRCUIT, T.CIRCUIT_ORE, T.PLASMA_ROCK, T.PLASMA_ORE, T.CORE_ROCK, T.CORE_ORE, T.GATE, T.BASALT]);

export function isBlock(t: number): boolean {
  return BLOCKS.has(t);
}

/** Neighbour mask for the block at (x, y); `get` must handle out-of-range coordinates. */
export function edgeMask(get: (x: number, y: number) => number, x: number, y: number): number {
  let m = 0;
  if (!isBlock(get(x, y - 1))) m |= EDGE_N;
  if (!isBlock(get(x + 1, y))) m |= EDGE_E;
  if (!isBlock(get(x, y + 1))) m |= EDGE_S;
  if (!isBlock(get(x - 1, y))) m |= EDGE_W;
  return m;
}

/** 'x' = cleared (rounded corner), 'o' = outline, 'l' = light edge, 'd' = shaded edge, '' = texture. */
export type EdgePx = 'x' | 'o' | 'l' | 'd' | '';

export function edgePixel(mask: number, x: number, y: number, size: number): EdgePx {
  const n = (mask & EDGE_N) !== 0;
  const e = (mask & EDGE_E) !== 0;
  const s = (mask & EDGE_S) !== 0;
  const w = (mask & EDGE_W) !== 0;
  const L = size - 1;
  // Rounded corners: the corner pixel is cut, the one diagonally inside becomes outline.
  const corners: [boolean, number, number][] = [
    [n && w, 0, 0],
    [n && e, L, 0],
    [s && w, 0, L],
    [s && e, L, L],
  ];
  for (const [on, cx, cy] of corners) {
    if (!on) continue;
    if (x === cx && y === cy) return 'x';
    if (Math.abs(x - cx) === 1 && Math.abs(y - cy) === 1) return 'o';
  }
  if ((n && y === 0) || (s && y === L) || (w && x === 0) || (e && x === L)) return 'o';
  if ((s && y === L - 1) || (e && x === L - 1)) return 'd';
  if ((n && y === 1) || (w && x === 1)) return 'l';
  return '';
}

/** Surface tiles that grow lichen on an exposed top. */
export function growsMoss(t: number): boolean {
  return t === T.RUST || t === T.METAL || t === T.SOIL || t === T.RUIN;
}

/** Frost tops get a snow cap instead of lichen. */
export function growsSnow(t: number): boolean {
  return t === T.FROST;
}

/** Leaves merge with other leaves and with trunks (no outline between them). */
export function leafMask(get: (x: number, y: number) => number, x: number, y: number): number {
  const joined = (t: number): boolean => t === T.LEAVES || t === T.TRUNK;
  let m = 0;
  if (!joined(get(x, y - 1))) m |= EDGE_N;
  if (!joined(get(x + 1, y))) m |= EDGE_E;
  if (!joined(get(x, y + 1))) m |= EDGE_S;
  if (!joined(get(x - 1, y))) m |= EDGE_W;
  return m;
}
