/**
 * Terrain variety (P12-F): big soft tone patches and rare embedded details, so wide ground and rock
 * faces stop reading as one repeating texture. Cosmetic, pure and deterministic; baked into chunks.
 * Details use plain light and shadow only (no glints, no colour), so none of them can pass for ore.
 */
import { hash2 } from '../sim/rng';
import { T } from '../sim/tiles';

/** Natural ground and layer rock. Ores, liquids and anything built keep their own flat look. */
const NATURAL = new Set<number>([T.RUST, T.SOIL, T.ASH, T.FROST, T.SAND, T.METAL, T.BASALT, T.PLASMA_ROCK, T.CORE_ROCK, T.GRAVEL]);

export function hasTerrainVariety(t: number): boolean {
  return NATURAL.has(t);
}

function lattice(ix: number, iy: number, salt: number): number {
  return hash2(ix, iy, salt);
}

function smooth(v: number): number {
  return v * v * (3 - 2 * v);
}

/** Smooth value noise in 0..1 with cells of sx by sy tiles. */
export function patchNoise(x: number, y: number, sx: number, sy: number, salt: number): number {
  const gx = x / sx;
  const gy = y / sy;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = smooth(gx - ix);
  const fy = smooth(gy - iy);
  const top = lattice(ix, iy, salt) * (1 - fx) + lattice(ix + 1, iy, salt) * fx;
  const bottom = lattice(ix, iy + 1, salt) * (1 - fx) + lattice(ix + 1, iy + 1, salt) * fx;
  return top * (1 - fy) + bottom * fy;
}

/** Tone steps, from a lifted patch to a deep shadowed one (null = leave the texture alone). */
export const TONES = ['rgba(255,232,208,0.05)', null, 'rgba(8,4,12,0.10)', 'rgba(8,4,12,0.19)'] as const;
/** Tone cells per tile side: four art pixels each, small enough that patch edges read as ragged. */
export const CELLS = 4;

/**
 * Tone step (an index into TONES) at a point in tile units. Two octaves, flattened sideways like
 * sediment, plus a little per-sample jitter so patch borders break up instead of drawing contours.
 */
export function toneAt(x: number, y: number): number {
  const n = patchNoise(x, y, 9, 5, 6101) * 0.68 + patchNoise(x, y, 3.5, 2.5, 6102) * 0.32;
  const v = n + (hash2(Math.floor(x * CELLS), Math.floor(y * CELLS), 6103) - 0.5) * 0.1;
  return v > 0.66 ? 0 : v > 0.46 ? 1 : v > 0.34 ? 2 : 3;
}

export type DetailKind = 'stone' | 'slab' | 'crack' | 'pocket' | 'grit';

/** Share of interior natural tiles that carry a detail. */
export const DETAIL_RATE = 0.09;

export function detailAt(tx: number, ty: number): DetailKind | null {
  if (hash2(tx, ty, 6201) >= DETAIL_RATE) return null;
  const k = hash2(ty, tx, 6202);
  if (k < 0.3) return 'stone';
  if (k < 0.45) return 'slab';
  if (k < 0.65) return 'crack';
  if (k < 0.8) return 'pocket';
  return 'grit';
}

export type Rect = [number, number, number, number, string];

const HI = 'rgba(255,236,214,0.24)';
const FACE = 'rgba(255,236,214,0.10)';
const LO = 'rgba(8,4,12,0.45)';
const HOLE = 'rgba(8,4,12,0.62)';

const DETAILS: Record<DetailKind, readonly Rect[]> = {
  // A rounded stone set in the ground: lit on top, shadowed underneath.
  stone: [[5, 6, 5, 1, HI], [4, 7, 7, 3, FACE], [4, 7, 1, 2, HI], [5, 10, 6, 1, LO], [11, 8, 1, 2, LO]],
  // A flat buried slab.
  slab: [[2, 7, 11, 1, HI], [2, 8, 12, 2, FACE], [3, 10, 11, 1, LO], [8, 8, 1, 2, LO]],
  crack: [[3, 3, 2, 1, LO], [5, 4, 1, 3, LO], [6, 7, 2, 1, LO], [8, 8, 1, 3, LO], [9, 11, 3, 1, LO], [6, 4, 1, 3, FACE], [9, 8, 1, 3, FACE]],
  // A small hollow with a lit lower lip.
  pocket: [[6, 5, 4, 1, HOLE], [5, 6, 6, 3, HOLE], [6, 9, 4, 1, HOLE], [6, 10, 4, 1, HI], [11, 7, 1, 2, FACE]],
  grit: [[3, 4, 2, 2, FACE], [3, 6, 2, 1, LO], [10, 3, 1, 1, HI], [10, 4, 1, 1, LO], [7, 10, 3, 2, FACE], [7, 12, 3, 1, LO], [12, 12, 1, 1, HI]],
};

/** Rect list (16ths of a tile) for one detail, mirrored on some tiles. */
export function detailRects(kind: DetailKind, flip: boolean): Rect[] {
  return DETAILS[kind].map(([x, y, w, h, c]) => [flip ? 16 - x - w : x, y, w, h, c]);
}
