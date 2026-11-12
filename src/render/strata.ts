/** Soil strata and buried decals for natural ground near the surface. Cosmetic, pure, deterministic. */
import { hash2 } from '../sim/rng';
import { T } from '../sim/tiles';

/** Ground tiles that get strata bands (only where the world generated them, see renderer). */
const GROUND = new Set<number>([T.RUST, T.SOIL, T.ASH, T.FROST, T.SAND, T.METAL]);
export const STRATA_DEPTH = 36;
const BAND = 6;

export function hasStrata(t: number): boolean {
  return GROUND.has(t);
}

/** Wavy offset so bands follow the land a little instead of ruler-flat lines. */
export function strataWobble(tx: number): number {
  return Math.round(Math.sin(tx * 0.19) * 1.3 + Math.sin(tx * 0.061 + 1.7) * 1.6);
}

export interface StrataShade {
  /** Black overlay alpha (deeper soil and alternating bands are darker). */
  dark: number;
  /** Light seam on the top 2 px of this tile (a band boundary), 0 if none. */
  seam: number;
}

/** Shade for a ground tile `depth` rows below the surface at column tx. Zero above ground or too deep. */
export function strataShade(depth: number, tx: number): StrataShade {
  if (depth < 1 || depth > STRATA_DEPTH) return { dark: 0, seam: 0 };
  const d = depth + strataWobble(tx);
  const band = Math.floor(Math.max(0, d) / BAND);
  const fade = depth > STRATA_DEPTH - 6 ? (STRATA_DEPTH - depth) / 6 : 1;
  const dark = (Math.min(0.22, depth * 0.009) + (band % 2 === 1 ? 0.17 : 0)) * fade;
  const seam = d > 0 && d % BAND === 0 ? 0.26 * fade : 0;
  return { dark, seam };
}

export type DecalKind = 'bone' | 'pipe' | 'pebbles' | 'skull';

/** A rare buried object in this ground tile, or null. Bones and pipes sit in the top rows only. */
export function buriedDecal(tx: number, ty: number, depth: number): DecalKind | null {
  if (depth < 2 || depth > 22) return null;
  const h = hash2(tx, ty, 9137);
  if (h > 0.045) return null;
  const k = hash2(ty, tx, 9139);
  if (k < 0.35) return 'pebbles';
  if (k < 0.65) return 'bone';
  if (k < 0.88) return 'pipe';
  return 'skull';
}

type R = [number, number, number, number, string];

/** Rect lists in 16ths of a tile; second arg flips horizontally for variety. */
export function decalRects(kind: DecalKind, flip: boolean): R[] {
  const r: R[] = (() => {
    switch (kind) {
      case 'pebbles':
        return [[3, 9, 2, 2, '#8a6a58'], [3, 9, 1, 1, '#b8968a'], [8, 5, 3, 2, '#7a5a4a'], [8, 5, 1, 1, '#a8867a'], [11, 11, 2, 2, '#6a4a3a']];
      case 'bone':
        return [[3, 7, 10, 2, '#d8ccb0'], [2, 6, 2, 2, '#e8dcc0'], [2, 8, 2, 2, '#e8dcc0'], [12, 6, 2, 2, '#e8dcc0'], [12, 8, 2, 2, '#e8dcc0'], [4, 9, 8, 1, '#9a8c70']];
      case 'pipe':
        return [[0, 6, 11, 4, '#5a6274'], [0, 6, 11, 1, '#8a94a8'], [0, 9, 11, 1, '#343a46'], [10, 5, 3, 6, '#6a7286'], [10, 5, 3, 1, '#a0aabc'], [3, 7, 2, 2, '#b8683a']];
      case 'skull':
        return [[4, 4, 8, 6, '#e0d4b8'], [5, 10, 6, 2, '#d0c4a8'], [5, 6, 2, 2, '#2a1e18'], [9, 6, 2, 2, '#2a1e18'], [7, 9, 2, 1, '#2a1e18'], [5, 12, 1, 1, '#2a1e18'], [7, 12, 1, 1, '#2a1e18'], [9, 12, 1, 1, '#2a1e18']];
    }
  })();
  return flip ? r.map(([x, y, w, h, c]) => [16 - x - w, y, w, h, c] as R) : r;
}
