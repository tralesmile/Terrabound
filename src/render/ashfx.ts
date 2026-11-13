// Ash Dunes surface variety: pale wind-blown ash drifts on exposed tops and patches of cracked,
// glowing crust in world-space clusters, so the dunes stop reading as one flat dotted texture.
// Pure pixel functions (no DOM); the renderer bakes them into small atlases.
import { hash2 } from '../sim/rng';

type Px = (string | null)[];
const TS = 16;

/** Height in art px of the ash drift strip drawn over exposed Ash tops. */
export const DRIFT_H = 7;
/** Drift colours: crest, body, shadow. */
export const DRIFT = ['#e0d8d2', '#b9b0aa', '#6e6461'] as const;
/** Crack colours: white-hot core, melt, cooled rim. */
export const CRACK = ['#ffd27a', '#ff7a2a', '#4a1c12'] as const;

/** Drift variants: tile tx uses variant tx mod 4, so one dune swell spans 4 tiles seamlessly. */
export const DRIFT_VARIANTS = 4;

/** Drift height (1..DRIFT_H) of column x in variant v: a smooth dune swell with wind ripples. */
export function driftHeight(x: number, v: number): number {
  const swell = 4 + 2 * Math.sin(((v * TS + x) / (TS * DRIFT_VARIANTS)) * Math.PI * 2);
  const ripple = hash2(x, v, 611) > 0.7 ? 1 : 0;
  return Math.max(1, Math.min(DRIFT_H, Math.round(swell + ripple)));
}

/** Ash drift cap (TS x DRIFT_H): bright crest pixel, body, a darker shadow pixel at its foot. */
export function driftPixels(v: number): Px {
  const px: Px = new Array(TS * DRIFT_H).fill(null);
  for (let x = 0; x < TS; x++) {
    const h = driftHeight(x, v);
    for (let y = 0; y < h; y++) {
      const c = y === 0 ? DRIFT[0] : y === h - 1 && h > 1 ? DRIFT[2] : hash2(x, y + v * 7, 612) > 0.82 ? DRIFT[0] : DRIFT[1];
      px[y * TS + x] = c;
    }
  }
  return px;
}

/** Smooth value noise in world tiles (cell size `cell`), 0..1. */
function valueNoise(tx: number, ty: number, cell: number, salt: number): number {
  const gx = Math.floor(tx / cell);
  const gy = Math.floor(ty / cell);
  const fx = tx / cell - gx;
  const fy = ty / cell - gy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(gx, gy, salt);
  const b = hash2(gx + 1, gy, salt);
  const c = hash2(gx, gy + 1, salt);
  const d = hash2(gx + 1, gy + 1, salt);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Number of crack pattern variants. */
export const CRACK_VARIANTS = 6;
/** Cracked crust shows down to this many tiles under the surface. */
export const CRACK_DEPTH = 5;

/** Crack variant for an Ash tile at (tx, ty) `depth` tiles under the surface, or -1 for calm ash. */
export function crackAt(tx: number, ty: number, depth: number): number {
  if (depth < 0 || depth > CRACK_DEPTH) return -1;
  // Clusters ~7 tiles across that fade out with depth: hot seams near the top, calm ash between.
  const n = valueNoise(tx, ty, 7, 613) - depth * 0.035;
  if (n < 0.66 || hash2(tx, ty, 615) < 0.3) return -1;
  return Math.floor(hash2(tx, ty, 614) * CRACK_VARIANTS);
}

/** Glowing crack lines (TS x TS, transparent elsewhere): a jagged seam with a branch, rim-dark edges. */
export function crackPixels(v: number): Px {
  const px: Px = new Array(TS * TS).fill(null);
  const put = (x: number, y: number, c: string): void => {
    if (x < 1 || y < 1 || x >= TS - 1 || y >= TS - 1) return;
    const i = y * TS + x;
    // Never overwrite a hotter colour with a cooler one.
    const rank = (k: string | null): number => (k === CRACK[0] ? 3 : k === CRACK[1] ? 2 : k === CRACK[2] ? 1 : 0);
    if (rank(c) > rank(px[i])) px[i] = c;
  };
  const seam = (x0: number, y0: number, steps: number, dx: number, salt: number): void => {
    let x = x0;
    let y = y0;
    for (let s = 0; s < steps; s++) {
      put(x, y + 1, CRACK[2]);
      put(x, y, s === steps >> 1 || (s > 1 && s < steps - 2 && hash2(s, v, salt) > 0.5) ? CRACK[0] : CRACK[1]);
      x += dx;
      y += hash2(s, v, salt + 1) > 0.55 ? 1 : hash2(s, v, salt + 2) > 0.75 ? -1 : 0;
    }
  };
  // One fissure of varied length and slope, sometimes with a short branch: no two tiles line up.
  const len = 5 + Math.floor(hash2(v, 3, 620) * 7);
  const x0 = 1 + Math.floor(hash2(v, 4, 621) * (TS - 1 - len));
  const y0 = 3 + Math.floor(hash2(v, 0, 615) * 9);
  seam(x0, y0, len, 1, 616);
  if (hash2(v, 5, 622) > 0.4) {
    const bx = x0 + 2 + Math.floor(hash2(v, 1, 617) * Math.max(1, len - 4));
    seam(bx, Math.max(2, y0 - 1), 3 + Math.floor(hash2(v, 6, 623) * 3), hash2(v, 2, 618) > 0.5 ? 1 : -1, 619);
  }
  return px;
}

/** Smoke puffs a cinder cone keeps in the air at once. */
export const CONE_PUFFS = 6;
/** Seconds one smoke puff takes to rise and fade. */
export const PUFF_LIFE = 4;

/**
 * Smoke puff k of a cinder cone at `time`: offset in art px from the crater mouth (x right, y up),
 * radius and alpha. Puffs rise, swell, lean downwind and fade; phases are staggered so the plume
 * is continuous. `seed` (the crater column) desynchronises neighbouring cones.
 */
export function conePuff(k: number, time: number, seed: number): { x: number; y: number; r: number; a: number } {
  const ph = (((time + seed * 0.731) / PUFF_LIFE + k / CONE_PUFFS) % 1 + 1) % 1;
  const sway = Math.sin(time * 0.6 + k * 1.9 + seed) * 3 * ph;
  return {
    x: ph * ph * 22 + sway,
    y: 4 + ph * 46,
    r: 2 + ph * 9,
    a: 0.6 * Math.min(1, ph * 6) * (1 - ph),
  };
}
