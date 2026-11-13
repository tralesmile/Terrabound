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
const BLOCKS = new Set<number>([T.RUST, T.METAL, T.IRON, T.COPPER, T.BEDROCK, T.PAD, T.SCAFFOLD, T.SOIL, T.ASH, T.FROST, T.SAND, T.CRYSTAL, T.RUIN, T.WRECK, T.CIRCUIT, T.CIRCUIT_ORE, T.PLASMA_ROCK, T.PLASMA_ORE, T.CORE_ROCK, T.CORE_ORE, T.GATE, T.BASALT, T.REINFORCED, T.SHIELD]);

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

/** Pseudo-masks for half-tile slope caps (atlas shapes after the 16 edge masks). */
export const SLOPE_R = MASKS; // top-right half cut: ground falls away to the right
export const SLOPE_L = MASKS + 1; // top-left half cut: ground falls away to the left
export const SLOPE_CR = MASKS + 2; // bottom-right half cut: a cave ceiling rising to the right
export const SLOPE_CL = MASKS + 3; // bottom-left half cut: a cave ceiling rising to the left
export const SHAPES = MASKS + 4;

/** Ceiling caps (cut underneath) as opposed to floor caps (cut on top). */
export function isCeilingSlope(shape: number): boolean {
  return shape === SLOPE_CR || shape === SLOPE_CL;
}

/**
 * Ground that softens into slopes. Metal is the Scrap layer's natural rock, so it slopes too; anything
 * the player placed keeps its square architecture (slopeShape's `built` check).
 */
const SLOPED = new Set<number>([T.RUST, T.METAL, T.SOIL, T.ASH, T.FROST, T.SAND, T.BASALT, T.CIRCUIT, T.PLASMA_ROCK, T.CORE_ROCK, T.IRON, T.COPPER]);

export function slopes(t: number): boolean {
  return SLOPED.has(t);
}

/**
 * A step corner becomes a 45 degree half-tile cap when it sits on a staircase: open above and on one
 * side, solid below and on the other side, and the ground continues one tile down on the open side.
 * Single-width pillars and overhangs stay square, and so does anything `built` (player-placed).
 * Returns SLOPE_R, SLOPE_L, SLOPE_CR, SLOPE_CL or 0.
 */
export function slopeShape(get: (x: number, y: number) => number, x: number, y: number, built?: (x: number, y: number) => boolean): number {
  const t = get(x, y);
  if (!slopes(t) || built?.(x, y)) return 0;
  const m = edgeMask(get, x, y);
  if (m === (EDGE_N | EDGE_E) && isBlock(get(x + 1, y + 1))) return SLOPE_R;
  if (m === (EDGE_N | EDGE_W) && isBlock(get(x - 1, y + 1))) return SLOPE_L;
  // Cave ceilings mirror it: open below and on one side, and the ceiling steps one tile up there.
  if (m === (EDGE_S | EDGE_E) && isBlock(get(x + 1, y - 1))) return SLOPE_CR;
  if (m === (EDGE_S | EDGE_W) && isBlock(get(x - 1, y - 1))) return SLOPE_CL;
  return 0;
}

/**
 * Pixel class inside a slope cap. For SLOPE_R the cut is above the diagonal running from the
 * top-left corner to the bottom-right corner; the diagonal itself is outline, one row in is lit.
 * SLOPE_L mirrors it.
 */
export function slopePixel(shape: number, x: number, y: number, size: number): EdgePx {
  const L = size - 1;
  const sx = shape === SLOPE_L || shape === SLOPE_CL ? L - x : x;
  // Ceiling caps are the floor caps flipped upside down, shaded (not lit) along the cut.
  const ceil = isCeilingSlope(shape);
  const sy = ceil ? L - y : y;
  if (sx > sy) return 'x';
  if (sx === sy) return 'o';
  if (sx === sy - 1) return ceil ? 'd' : 'l';
  // The bottom row and the open side keep the cell's usual outline where the slope meets them.
  return '';
}

/** First solid art row in column `x` of a slope cap (where moss or snow sits). */
export function slopeTop(shape: number, x: number, size: number): number {
  if (isCeilingSlope(shape)) return 0;
  return shape === SLOPE_L ? size - 1 - x : x;
}

/** Last solid art row in column `x` of a slope cap (the diagonal for ceiling caps, the bottom row for floor caps). */
export function slopeBottom(shape: number, x: number, size: number): number {
  if (shape === SLOPE_CR) return size - 1 - x;
  if (shape === SLOPE_CL) return x;
  return size - 1;
}
