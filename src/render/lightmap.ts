/**
 * Terraria-style tile light map. Pure (no DOM): integer flood fill over a rectangular region.
 * Light enters from the open sky above the original surface, torches, the suit lamp and the pad,
 * and loses AIR_COST per open tile and SOLID_COST per solid tile, so it seeps a few tiles into rock
 * (surfaces read) but fills caves only near a source.
 */
import { TILES } from '../sim/tiles';

/** Level that means full brightness. Sources can exceed it (they then stay bright for longer). */
export const LIGHT_MAX = 32;
export const AIR_COST = 4;
export const SOLID_COST = 8;
/** Highest level any source may have (Uint8 grid, bucket queue size). */
export const LEVEL_CAP = 96;
/** Darkness alpha for an unlit tile (never fully black, per docs/ART.md). */
export const DARK_MAX = 0.94;

export interface LightWorld {
  readonly w: number;
  readonly h: number;
  readonly surface: ArrayLike<number>;
  get(x: number, y: number): number;
}

export interface LightSource {
  x: number;
  y: number;
  level: number;
}

export interface LightGrid {
  x0: number;
  y0: number;
  w: number;
  h: number;
  levels: Uint8Array;
}

/** Open sky: full bright, and seeps ~6 tiles into the ground so surfaces read. */
export const SKY_LEVEL = 48;
/** Sources get a bright core of this many levels on top of their reach. */
export const CORE = 8;
/** Torch: full bright within ~2 tiles, fades out at ~10; the sim's spawn-safe zone (light > 0.3, < 4.9 tiles) is clearly lit. */
export const TORCH_LEVEL = 40;

/** Level for a light that should fade out after `radius` open tiles. */
export function levelForRadius(radius: number): number {
  return Math.max(0, Math.min(LEVEL_CAP, Math.round(radius * AIR_COST)));
}

export function brightness(level: number): number {
  return Math.min(1, Math.max(0, level / LIGHT_MAX));
}

/** True for open cells that see the sky: non-solid and above the column's original surface. */
export function isSky(world: LightWorld, x: number, y: number): boolean {
  if (y < 0) return true;
  if (x < 0 || x >= world.w || y >= world.h) return false;
  return y < world.surface[x] && !TILES[world.get(x, y)]?.solid;
}

export function computeLight(
  world: LightWorld,
  x0: number,
  y0: number,
  w: number,
  h: number,
  sources: readonly LightSource[],
  skyLevel: number,
): LightGrid {
  const n = w * h;
  const levels = new Uint8Array(n);
  const buckets: number[][] = Array.from({ length: LEVEL_CAP + 1 }, () => []);
  const sky = Math.max(0, Math.min(LEVEL_CAP, Math.round(skyLevel)));
  const solid = new Uint8Array(n);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const x = x0 + i;
      const y = y0 + j;
      const k = j * w + i;
      const t = world.get(x, y);
      solid[k] = TILES[t]?.solid ? 1 : 0;
      if (sky > 0 && isSky(world, x, y)) {
        levels[k] = sky;
        buckets[sky].push(k);
      }
    }
  }
  for (const s of sources) {
    const i = Math.floor(s.x) - x0;
    const j = Math.floor(s.y) - y0;
    if (i < 0 || j < 0 || i >= w || j >= h) continue;
    const lv = Math.max(0, Math.min(LEVEL_CAP, Math.round(s.level)));
    const k = j * w + i;
    if (lv > levels[k]) {
      levels[k] = lv;
      buckets[lv].push(k);
    }
  }
  for (let lv = LEVEL_CAP; lv > 0; lv--) {
    const b = buckets[lv];
    for (let q = 0; q < b.length; q++) {
      const k = b[q];
      if (levels[k] !== lv) continue; // superseded by a brighter path
      const i = k % w;
      const j = (k - i) / w;
      for (let d = 0; d < 4; d++) {
        const ni = d === 0 ? i + 1 : d === 1 ? i - 1 : i;
        const nj = d === 2 ? j + 1 : d === 3 ? j - 1 : j;
        if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
        const nk = nj * w + ni;
        const nl = lv - (solid[nk] ? SOLID_COST : AIR_COST);
        if (nl > levels[nk]) {
          levels[nk] = nl;
          buckets[nl].push(nk);
        }
      }
    }
    b.length = 0;
  }
  return { x0, y0, w, h, levels };
}

/** Level at a world tile, 0 outside the grid. */
export function levelAt(g: LightGrid, x: number, y: number): number {
  const i = x - g.x0;
  const j = y - g.y0;
  if (i < 0 || j < 0 || i >= g.w || j >= g.h) return 0;
  return g.levels[j * g.w + i];
}

/** Light sources for a frame: every torch in the region, the suit lamp and the landing pad glow. */
export function frameSources(
  torches: Iterable<number>,
  worldW: number,
  lamp: { x: number; y: number; radius: number },
  pad: { x: number; y: number },
): LightSource[] {
  const out: LightSource[] = [];
  for (const i of torches) out.push({ x: i % worldW, y: Math.floor(i / worldW), level: TORCH_LEVEL });
  out.push({ x: lamp.x, y: lamp.y, level: levelForRadius(lamp.radius) + CORE });
  out.push({ x: pad.x, y: pad.y - 1, level: 16 });
  return out;
}
