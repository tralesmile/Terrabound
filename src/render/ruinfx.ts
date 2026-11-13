// Ruin weathering: ancient brick should read as old, not as a fresh grid of identical blocks.
// Three overlays baked into the chunk cache: cracked / missing bricks, soot and rain streaks
// washing down from exposed tops, and vines (icicles in the Frozen Spires) hanging off undersides.
// Pure pixel functions and placement rules (no DOM); the renderer bakes them into small strips.
import { hash2 } from '../sim/rng';
import { B } from '../sim/biomes';

type Px = (string | null)[];
const TS = 16;

/** Crack colours: deep gap, mortar shadow, chipped (lit) brick edge. */
export const RCRACK = ['#15161e', '#23252f', '#6a7088'] as const;
/** Soot streak colours: heavy, light. */
export const SOOT = ['#15161d', '#262832'] as const;
/** Vine colours: dark stem, leaf, lit leaf. Icicle colours: rim, body, glint. */
export const VINE = ['#1f3a22', '#3f7a3a', '#7ec46a'] as const;
export const ICICLE = ['#6f8fb0', '#bfe2ff', '#ffffff'] as const;

export const RCRACK_VARIANTS = 6;
export const SOOT_VARIANTS = 4;
export const HANG_VARIANTS = 6;
/** Hanging overlays drop at most this many art px into the air cell below a ruin brick. */
export const HANG_H = 12;

/** Crack variant for a ruin brick, or -1 for a clean one (about 40% weather). */
export function ruinCrackAt(tx: number, ty: number): number {
  if (hash2(tx, ty, 701) < 0.6) return -1;
  return Math.floor(hash2(tx, ty, 702) * RCRACK_VARIANTS);
}

/**
 * Soot variant for a ruin brick: streaks wash down from an exposed top, so a brick with open sky (air)
 * above it, or one under such a brick, gets streaks. Ash Dunes ruins are always sooted. -1 for none.
 */
export function sootAt(tx: number, ty: number, airAbove: boolean, airTwoAbove: boolean, biome: number): number {
  const chance = biome === B.ASH ? 1 : airAbove ? 0.7 : airTwoAbove ? 0.35 : 0;
  if (chance === 0 || hash2(tx, ty, 703) >= chance) return -1;
  return Math.floor(hash2(tx, ty, 704) * SOOT_VARIANTS);
}

/** What hangs under a ruin brick in this biome: vines, icicles, or nothing (Ash Dunes are too hot). */
export function hangKind(biome: number): 'vine' | 'icicle' | null {
  if (biome === B.ASH) return null;
  return biome === B.FROST ? 'icicle' : 'vine';
}

/** Hanging variant for the air cell under a ruin brick, or -1 (about half the undersides). */
export function hangAt(tx: number, ty: number): number {
  if (hash2(tx, ty, 705) < 0.5) return -1;
  return Math.floor(hash2(tx, ty, 706) * HANG_VARIANTS);
}

/** Cracked brick (TS x TS overlay): a jagged mortar crack and, on some, a missing chip with a lit rim. */
export function ruinCrackPixels(v: number): Px {
  const px: Px = new Array(TS * TS).fill(null);
  const put = (x: number, y: number, c: string): void => {
    if (x >= 1 && y >= 1 && x < TS - 1 && y < TS - 1) px[y * TS + x] = c;
  };
  // A crack wanders downward from a random top point, stepping sideways.
  let x = 3 + Math.floor(hash2(v, 1, 710) * 10);
  const len = 6 + Math.floor(hash2(v, 2, 711) * 7);
  for (let y = 2; y < 2 + len; y++) {
    put(x, y, RCRACK[0]);
    put(x + 1, y, RCRACK[1]);
    const r = hash2(v, y, 712);
    x += r > 0.7 ? 1 : r < 0.3 ? -1 : 0;
    x = Math.max(2, Math.min(TS - 4, x));
  }
  // A chipped-out corner on half the variants: dark hole, lit lower-right rim.
  if (v % 2 === 0) {
    const cx = hash2(v, 3, 713) > 0.5 ? 2 : TS - 6;
    const cy = hash2(v, 4, 714) > 0.5 ? 2 : TS - 6;
    for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 4 - yy; xx++) put(cx + xx, cy + yy, RCRACK[0]);
    for (let xx = 0; xx < 4; xx++) put(cx + xx, cy + 3, RCRACK[2]);
  }
  return px;
}

/** Soot streaks (TS x TS overlay): 2-4 vertical streaks from the top, thinning out as they run down. */
export function sootPixels(v: number): Px {
  const px: Px = new Array(TS * TS).fill(null);
  const n = 2 + Math.floor(hash2(v, 1, 720) * 3);
  for (let i = 0; i < n; i++) {
    const x = 1 + Math.floor(hash2(v, i + 10, 721) * (TS - 2));
    const len = 6 + Math.floor(hash2(v, i + 20, 722) * 9);
    for (let y = 0; y < len && y < TS; y++) {
      // Heavy at the top; lower down, gaps appear as the streak breaks up.
      if (y > len / 2 && hash2(x, y + v * 31, 723) < 0.4) continue;
      px[y * TS + x] = y < len / 3 ? SOOT[0] : SOOT[1];
    }
  }
  return px;
}

/** Hanging strip (TS x HANG_H overlay drawn at the top of the air cell under a brick). */
export function hangPixels(kind: 'vine' | 'icicle', v: number): Px {
  const px: Px = new Array(TS * HANG_H).fill(null);
  const put = (x: number, y: number, c: string): void => {
    if (x >= 0 && y >= 0 && x < TS && y < HANG_H) px[y * TS + x] = c;
  };
  const strands = 1 + Math.floor(hash2(v, 1, 730) * 3);
  for (let i = 0; i < strands; i++) {
    const x0 = 1 + Math.floor(hash2(v, i + 5, 731) * (TS - 3));
    const len = 3 + Math.floor(hash2(v, i + 9, 732) * (HANG_H - 3));
    if (kind === 'icicle') {
      // A tapering spike: 3 px wide at the root, 1 px at the tip, with a glint.
      for (let y = 0; y < len; y++) {
        const w = y < len / 3 ? 3 : y < (2 * len) / 3 ? 2 : 1;
        for (let k = 0; k < w; k++) put(x0 + k, y, k === 0 ? ICICLE[0] : ICICLE[1]);
      }
      put(x0 + 1, 1, ICICLE[2]);
    } else {
      // A drooping stem that sways a pixel and sprouts leaves on alternating sides.
      let x = x0;
      for (let y = 0; y < len; y++) {
        put(x, y, VINE[0]);
        if (y % 3 === 1) {
          const side = (y + i) % 2 === 0 ? -1 : 1;
          put(x + side, y, VINE[1]);
          put(x + side, y - 1, hash2(v, y + i * 13, 733) > 0.5 ? VINE[2] : VINE[1]);
        }
        if (hash2(v, y + i * 17, 734) > 0.8) x += hash2(v, y, 735) > 0.5 ? 1 : -1;
      }
      put(x, len, VINE[2]);
    }
  }
  return px;
}

/** Grime on old (worldgen) back plates: water stains, rust blooms and cracked panels. */
export const GRIME = ['#1d222d', '#4a3328', '#6b4430', '#141820'] as const;
export const GRIME_VARIANTS = 8;

/** Grime variant for an untouched worldgen plate wall, or -1 (about 70% of old plates are stained). */
export function grimeAt(tx: number, ty: number): number {
  if (hash2(tx, ty, 740) < 0.3) return -1;
  return Math.floor(hash2(tx, ty, 741) * GRIME_VARIANTS);
}

/**
 * Plate grime (TS x TS overlay). Every variant has a water stain running down from the top seam;
 * every fourth adds a rust run-off patch, every third a diagonal crack across the panel; together they
 * break the identical panel grid of an abandoned ruin.
 */
export function grimePixels(v: number): Px {
  const px: Px = new Array(TS * TS).fill(null);
  const put = (x: number, y: number, c: string): void => {
    if (x >= 1 && y >= 1 && x < TS - 1 && y < TS - 1) px[y * TS + x] = c;
  };
  // Water stain: a 2 px wide streak from the top, fraying out at a random length.
  const sx = 2 + Math.floor(hash2(v, 1, 742) * 11);
  const sl = 5 + Math.floor(hash2(v, 2, 743) * 10);
  for (let y = 1; y < sl; y++) {
    put(sx, y, GRIME[0]);
    if (y < sl - 3 || hash2(v, y, 744) > 0.5) put(sx + 1, y, GRIME[0]);
  }
  if (v % 4 === 1) {
    // Rust bloom: an irregular run-off patch under a rivet, brighter at its heart, fading downward.
    const cx = 3 + Math.floor(hash2(v, 3, 745) * 10);
    const cy = 3 + Math.floor(hash2(v, 4, 746) * 6);
    for (let dy = 0; dy <= 4; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const keep = 0.9 - dy * 0.17 - Math.abs(dx) * 0.22;
        if (hash2(cx + dx, cy + dy + v * 5, 747) > keep) continue;
        put(cx + dx, cy + dy, dy === 0 && dx === 0 ? GRIME[2] : GRIME[1]);
      }
    }
  }
  if (v % 3 === 0) {
    // A crack across the panel from one edge to the other.
    let y = 3 + Math.floor(hash2(v, 5, 748) * 9);
    for (let x = 1; x < TS - 1; x++) {
      put(x, y, GRIME[3]);
      if (hash2(x, v, 749) > 0.65) y += hash2(x, v, 750) > 0.5 ? 1 : -1;
    }
  }
  return px;
}
