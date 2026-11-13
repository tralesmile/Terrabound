/** Deterministic helpers. Everything procedural in the game derives from these so seeds replay exactly. */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer lattice hash -> [0, 1). */
export function hash2(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Smooth 2D value noise in [0, 1). */
export function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Mix two ints into a new seed (used for per-run dive seeds). */
export function mixSeed(a: number, b: number): number {
  return Math.floor(hash2(a, b, 0x9e3779b9) * 4294967295) >>> 0;
}

/**
 * valueNoise(x / sx, y / sy, seed) for integer x in [0, w) and y in [0, h), from a precomputed lattice:
 * the same hashes, smoothing and blend as valueNoise (bit-identical results), but four table reads
 * instead of four hashes per sample. Worldgen samples every tile several times, so this is its hot path.
 */
export function noiseGrid(seed: number, sx: number, sy: number, w: number, h: number): (x: number, y: number) => number {
  const lw = Math.floor((w - 1) / sx) + 2;
  const lh = Math.floor((h - 1) / sy) + 2;
  const lat = new Float64Array(lw * lh);
  for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) lat[j * lw + i] = hash2(i, j, seed);
  const cx = new Int32Array(w);
  const fxs = new Float64Array(w);
  for (let x = 0; x < w; x++) {
    const v = x / sx;
    cx[x] = Math.floor(v);
    fxs[x] = smooth(v - cx[x]);
  }
  const cy = new Int32Array(h);
  const fys = new Float64Array(h);
  for (let y = 0; y < h; y++) {
    const v = y / sy;
    cy[y] = Math.floor(v);
    fys[y] = smooth(v - cy[y]);
  }
  return (x: number, y: number): number => {
    const k = cy[y] * lw + cx[x];
    const fx = fxs[x];
    const fy = fys[y];
    const a = lat[k];
    const b = lat[k + 1];
    const c = lat[k + lw];
    const d = lat[k + lw + 1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}
