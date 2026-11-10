/**
 * Procedural art for world decoration: per-biome leaves (autotiled), trunks, plants, cave mushrooms,
 * loot chests, snow caps and sky palettes. Pure pixel functions plus small canvas builders.
 */
import { hash2 } from '../sim/rng';
import { B, BIOME_IDS } from '../sim/biomes';
import { MASKS } from './autotile';
import { TS, makeCanvas } from './sprites';

type Px = (string | null)[];

interface Foliage {
  base: string;
  light: string;
  dark: string;
  accent: string;
  trunk: string;
  trunkDark: string;
}

export const FOLIAGE: Record<number, Foliage> = {
  [B.WASTES]: { base: '#2c6f78', light: '#5fe0e0', dark: '#1d4a52', accent: '#a8fff4', trunk: '#6b7080', trunkDark: '#43475a' },
  [B.JUNGLE]: { base: '#3f8f3a', light: '#6cc04a', dark: '#285c2a', accent: '#ff7ab8', trunk: '#6b4a2e', trunkDark: '#47301d' },
  [B.CRYSTAL]: { base: '#8a5fd6', light: '#d8b8ff', dark: '#5a3a9a', accent: '#8ff4ff', trunk: '#7a6a9a', trunkDark: '#4f4470' },
  [B.ASH]: { base: '#5a4a40', light: '#7a6656', dark: '#3a2e28', accent: '#ff8a3c', trunk: '#2f2725', trunkDark: '#1b1514' },
  [B.FROST]: { base: '#2f6b5e', light: '#e6f6ff', dark: '#1f4a42', accent: '#bfe8ff', trunk: '#5a4330', trunkDark: '#3a2a1e' },
};
/** Row used for underground growth (glowing mushrooms). */
export const CAVE_ROW = 5;
export const PLANT_VARIANTS = 4;
export const LEAF_VARIANTS = 2;

const OUT = '#14181f';

function blank(): Px {
  return new Array(TS * TS).fill(null);
}

function setter(px: Px): (x: number, y: number, c: string) => void {
  return (x, y, c) => {
    if (x >= 0 && y >= 0 && x < TS && y < TS) px[y * TS + x] = c;
  };
}

/** Leaves: speckled clusters; exposed sides (mask bits) get rounded, outlined edges. */
export function leafPixels(biome: number, v: number, mask: number): Px {
  const f = FOLIAGE[biome] ?? FOLIAGE[B.JUNGLE];
  const px: Px = new Array(TS * TS).fill(f.base);
  const put = setter(px);
  for (let y = 0; y < TS; y++)
    for (let x = 0; x < TS; x++) {
      const h = hash2(x + v * 19, y, 777 + biome);
      if (h > 0.8) put(x, y, f.light);
      else if (h < 0.16) put(x, y, f.dark);
    }
  // Leaf clusters: small light arcs over dark undersides.
  for (let i = 0; i < 5; i++) {
    const cx = 2 + Math.floor(hash2(i, v, 31 + biome) * 12);
    const cy = 2 + Math.floor(hash2(v, i, 37 + biome) * 12);
    put(cx, cy, f.light);
    put(cx + 1, cy, f.light);
    put(cx - 1, cy + 1, f.dark);
    put(cx + 2, cy + 1, f.dark);
  }
  if (biome === B.JUNGLE || biome === B.WASTES || biome === B.CRYSTAL) {
    // Fruit / glowing pods / sparkles.
    const ax = 3 + Math.floor(hash2(v, 3, 91 + biome) * 10);
    const ay = 3 + Math.floor(hash2(v, 4, 91 + biome) * 10);
    put(ax, ay, f.accent);
    put(ax + 1, ay, f.accent);
    put(ax, ay + 1, f.accent);
  }
  // Organic silhouette: exposed sides get a ragged 1-3 px bite and big rounded corners.
  const n = (mask & 1) !== 0;
  const e = (mask & 2) !== 0;
  const so = (mask & 4) !== 0;
  const w = (mask & 8) !== 0;
  const jag = (side: number, a: number): number => 1 + Math.floor(hash2(a >> 1, side + v * 4, 900 + biome) * 2.6);
  const inside = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= TS || y >= TS) {
      // Across an unexposed side the canopy continues.
      if (y < 0) return !n;
      if (y >= TS) return !so;
      if (x < 0) return !w;
      return !e;
    }
    if (n && y < jag(0, x)) return false;
    if (so && y > TS - 1 - jag(1, x)) return false;
    if (w && x < jag(2, y)) return false;
    if (e && x > TS - 1 - jag(3, y)) return false;
    const R = 5;
    const corner = (cx: number, cy: number): boolean => Math.hypot(x - cx, y - cy) > R + 0.3;
    if (n && w && x < R && y < R && corner(R, R)) return false;
    if (n && e && x > TS - 1 - R && y < R && corner(TS - 1 - R, R)) return false;
    if (so && w && x < R && y > TS - 1 - R && corner(R, TS - 1 - R)) return false;
    if (so && e && x > TS - 1 - R && y > TS - 1 - R && corner(TS - 1 - R, TS - 1 - R)) return false;
    return true;
  };
  const out: Px = px.slice();
  for (let y = 0; y < TS; y++)
    for (let x = 0; x < TS; x++) {
      if (!inside(x, y)) {
        out[y * TS + x] = null;
        continue;
      }
      const rim = !inside(x, y - 1) || !inside(x + 1, y) || !inside(x, y + 1) || !inside(x - 1, y);
      if (rim) out[y * TS + x] = OUT;
      else if (!inside(x, y - 2) || !inside(x - 2, y)) out[y * TS + x] = biome === B.FROST && !inside(x, y - 2) ? '#f4fbff' : f.light;
      else if (!inside(x, y + 2) || !inside(x + 2, y)) out[y * TS + x] = f.dark;
    }
  return out;
}

/** Trunk: a 6 px bark column with grain; antenna-metal in the wastes. */
export function trunkPixels(biome: number, v: number): Px {
  const f = FOLIAGE[biome] ?? FOLIAGE[B.JUNGLE];
  const px = blank();
  const put = setter(px);
  for (let y = 0; y < TS; y++) {
    put(4, y, OUT);
    put(11, y, OUT);
    for (let x = 5; x <= 10; x++) put(x, y, x <= 6 ? f.trunk : x >= 9 ? f.trunkDark : hash2(x, y + v * 16, 41) > 0.7 ? f.trunkDark : f.trunk);
  }
  if (biome === B.WASTES) {
    // Rivet bands and a cable.
    for (let x = 5; x <= 10; x++) put(x, 4 + v * 4, '#8e98b0');
    put(7, 10, '#36e0e8');
  } else {
    // Knot.
    put(7 + (v % 2), 6 + v * 3, f.trunkDark);
    put(8 + (v % 2), 7 + v * 3, f.trunkDark);
  }
  return px;
}

/** Small plants per biome, four variants; row CAVE_ROW is cave mushrooms. */
export function plantPixels(row: number, v: number): Px {
  const px = blank();
  const put = setter(px);
  const f = FOLIAGE[row] ?? FOLIAGE[B.JUNGLE];
  const blade = (x: number, h: number, lean: number, c: string, tip: string): void => {
    for (let i = 0; i < h; i++) put(x + Math.round((lean * i) / h), TS - 1 - i, i === h - 1 ? tip : c);
  };
  if (row === CAVE_ROW) {
    // Glowing mushrooms: stem + cap, cyan or violet.
    const caps = v % 2 === 0 ? ['#36e0e8', '#a8fff4'] : ['#b06bff', '#e2c4ff'];
    const n = 1 + (v % 3);
    for (let k = 0; k < n; k++) {
      const x = 3 + k * 4 + Math.floor(hash2(k, v, 5) * 2);
      const h = 4 + Math.floor(hash2(k, v, 6) * 6);
      for (let i = 0; i < h; i++) put(x, TS - 1 - i, '#d8d0c0');
      const cy = TS - 1 - h;
      for (let dx = -2; dx <= 2; dx++) put(x + dx, cy, caps[0]);
      for (let dx = -1; dx <= 1; dx++) put(x + dx, cy - 1, caps[0]);
      put(x, cy - 1, caps[1]);
      put(x - 2, cy + 1, OUT);
      put(x + 2, cy + 1, OUT);
    }
    return px;
  }
  const seed = row * 10 + v;
  switch (row) {
    case B.JUNGLE:
      if (v === 3) {
        // Broad-leaf bush.
        for (let y = 7; y < TS; y++) for (let x = 2; x < 14; x++) if (Math.hypot(x - 8, (y - 12) * 1.4) < 6.5) put(x, y, hash2(x, y, seed) > 0.7 ? f.light : f.base);
        put(6, 9, f.accent);
        put(10, 11, f.accent);
      } else {
        for (let i = 0; i < 5 + v; i++) blade(2 + Math.floor(hash2(i, v, seed) * 12), 3 + Math.floor(hash2(v, i, seed) * 8), Math.round((hash2(i, 9, seed) - 0.5) * 4), i % 2 ? f.base : f.dark, f.light);
        if (v === 1) {
          put(8, 6, f.accent);
          put(9, 6, f.accent);
          put(8, 7, '#ffd36b');
        }
      }
      break;
    case B.CRYSTAL:
      for (let k = 0; k < 1 + (v % 3); k++) {
        const x = 4 + k * 4 + v;
        const h = 4 + Math.floor(hash2(k, v, seed) * 7);
        for (let i = 0; i < h; i++) {
          const w = Math.max(0, Math.floor((h - i) / 3));
          for (let dx = -w; dx <= w; dx++) put(x + dx, TS - 1 - i, dx < 0 ? f.light : f.base);
        }
        put(x, TS - h, f.accent);
      }
      break;
    case B.ASH:
      if (v < 2) {
        // Charred stump with embers.
        for (let y = 10; y < TS; y++) for (let x = 5; x < 11; x++) put(x, y, x === 5 || x === 10 ? OUT : f.base);
        put(7, 9, f.dark);
        put(7, 11, f.accent);
        put(9, 13, f.accent);
      } else for (let i = 0; i < 4; i++) blade(3 + i * 3, 3 + Math.floor(hash2(i, v, seed) * 5), 1, f.dark, f.accent);
      break;
    case B.FROST:
      if (v === 3) {
        for (let i = 0; i < 8; i++) {
          const w = Math.floor((8 - i) / 2);
          for (let dx = -w; dx <= w; dx++) put(8 + dx, TS - 1 - i, dx <= 0 ? '#e6f6ff' : '#9fcbe8');
        }
      } else for (let i = 0; i < 5; i++) blade(2 + Math.floor(hash2(i, v, seed) * 12), 3 + Math.floor(hash2(v, i, seed) * 6), Math.round((hash2(i, 9, seed) - 0.5) * 3), '#7fa8b8', '#e6f6ff');
      break;
    default:
      // Rust Wastes: dry wire grass and the odd bolt.
      for (let i = 0; i < 4 + v; i++) blade(2 + Math.floor(hash2(i, v, seed) * 12), 2 + Math.floor(hash2(v, i, seed) * 6), Math.round((hash2(i, 9, seed) - 0.5) * 4), '#8a6a4a', '#c9a35a');
      if (v === 2) {
        put(7, 14, '#8e98b0');
        put(8, 14, '#8e98b0');
        put(7, 15, '#5d6a80');
        put(8, 15, '#5d6a80');
      }
  }
  return px;
}

/** Loot chest: riveted crate with a glowing lock so it reads in the dark. */
export function chestPixels(): Px {
  const px = blank();
  const put = setter(px);
  for (let y = 5; y < TS; y++)
    for (let x = 1; x < 15; x++) {
      const edge = x === 1 || x === 14 || y === 5 || y === TS - 1;
      put(x, y, edge ? OUT : y <= 8 ? '#8a6a36' : '#6b5028');
    }
  for (let x = 2; x < 14; x++) {
    put(x, 6, '#c9a35a');
    put(x, 9, '#3a2a14');
  }
  for (const [x, y] of [[3, 11], [12, 11], [3, 13], [12, 13]]) put(x, y, '#c9a35a');
  for (let y = 8; y <= 11; y++) for (let x = 7; x <= 8; x++) put(x, y, '#36e0e8');
  put(7, 8, '#c8ffff');
  return px;
}

/** Snow cap for exposed frost tops (TS x SNOW_H). */
export const SNOW_H = 4;
export function snowPixels(v: number): Px {
  const px: Px = new Array(TS * SNOW_H).fill(null);
  for (let x = 0; x < TS; x++) {
    px[x] = '#f4fbff';
    px[TS + x] = hash2(x, v, 401) > 0.3 ? '#e6f6ff' : '#bfe0f0';
    const drip = Math.floor(hash2(x, v, 402) * 4) - 1;
    for (let y = 2; y < 2 + drip && y < SNOW_H; y++) px[y * TS + x] = '#bfe0f0';
  }
  return px;
}

function paint(ctx: CanvasRenderingContext2D, px: Px, ox: number, oy: number, w = TS): void {
  for (let i = 0; i < px.length; i++) {
    const c = px[i];
    if (!c) continue;
    ctx.fillStyle = c;
    ctx.fillRect(ox + (i % w), oy + Math.floor(i / w), 1, 1);
  }
}

export interface DecorAtlas {
  leaves: HTMLCanvasElement;
  trunks: HTMLCanvasElement;
  plants: HTMLCanvasElement;
  chest: HTMLCanvasElement;
  snow: HTMLCanvasElement;
}

export function buildDecor(): DecorAtlas {
  const rows = BIOME_IDS.length;
  const leaves = makeCanvas(TS * MASKS * LEAF_VARIANTS, TS * rows);
  const trunks = makeCanvas(TS * 2, TS * rows);
  const plants = makeCanvas(TS * PLANT_VARIANTS, TS * (rows + 1));
  const chest = makeCanvas(TS, TS);
  const snow = makeCanvas(TS * 4, SNOW_H);
  const lc = leaves.getContext('2d');
  const tc = trunks.getContext('2d');
  const pc = plants.getContext('2d');
  const cc = chest.getContext('2d');
  const sc = snow.getContext('2d');
  for (const b of BIOME_IDS) {
    if (lc) for (let m = 0; m < MASKS; m++) for (let v = 0; v < LEAF_VARIANTS; v++) paint(lc, leafPixels(b, v, m), (m * LEAF_VARIANTS + v) * TS, b * TS);
    if (tc) for (let v = 0; v < 2; v++) paint(tc, trunkPixels(b, v), v * TS, b * TS);
  }
  if (pc) for (let r = 0; r <= rows; r++) for (let v = 0; v < PLANT_VARIANTS; v++) paint(pc, plantPixels(r, v), v * TS, r * TS);
  if (cc) paint(cc, chestPixels(), 0, 0);
  if (sc) for (let v = 0; v < 4; v++) paint(sc, snowPixels(v), v * TS, 0);
  return { leaves, trunks, plants, chest, snow };
}

/** Sky gradient stops per biome: top, middle, horizon; plus the skyline silhouette colour. */
export const SKY: Record<number, [string, string, string, string]> = {
  [B.WASTES]: ['#0b1026', '#2a1f4d', '#e87f5b', '#1a1536'],
  [B.JUNGLE]: ['#06181a', '#1d4a3a', '#a8d86a', '#0f2a22'],
  [B.CRYSTAL]: ['#120a2c', '#3d2a73', '#c79bff', '#1e1544'],
  [B.ASH]: ['#120a0a', '#3d1f1a', '#d9573a', '#221312'],
  [B.FROST]: ['#081830', '#2c5a8a', '#cfe8ff', '#16304e'],
};

function rgb(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Blend sky palettes by weight (weights per biome id; need not sum to 1). */
export function blendSky(weights: number[]): [string, string, string, string] {
  let total = 0;
  const acc = [0, 0, 0, 0].map(() => [0, 0, 0]);
  weights.forEach((wgt, b) => {
    if (!(wgt > 0) || !SKY[b]) return;
    total += wgt;
    SKY[b].forEach((c, k) => {
      const [r, g, bl] = rgb(c);
      acc[k][0] += r * wgt;
      acc[k][1] += g * wgt;
      acc[k][2] += bl * wgt;
    });
  });
  if (total === 0) return SKY[B.WASTES];
  const hex = (v: number[]): string => '#' + v.map((n) => Math.round(n / total).toString(16).padStart(2, '0')).join('');
  return [hex(acc[0]), hex(acc[1]), hex(acc[2]), hex(acc[3])];
}

/** Gallery section: per biome a trunk, leaf edge cases, plants; then cave mushrooms, chest and snow. */
export function drawDecorGallery(ctx: CanvasRenderingContext2D, x0: number, y0: number, z: number): void {
  const d = buildDecor();
  ctx.imageSmoothingEnabled = false;
  const cell = TS * z + 4;
  for (const b of BIOME_IDS) {
    let x = x0;
    const y = y0 + b * cell;
    ctx.drawImage(d.trunks, 0, b * TS, TS, TS, x, y, TS * z, TS * z);
    x += cell;
    for (const m of [15, 1, 0, 6]) {
      ctx.drawImage(d.leaves, m * LEAF_VARIANTS * TS, b * TS, TS, TS, x, y, TS * z, TS * z);
      x += cell;
    }
    x += 8;
    for (let v = 0; v < PLANT_VARIANTS; v++, x += cell) ctx.drawImage(d.plants, v * TS, b * TS, TS, TS, x, y, TS * z, TS * z);
  }
  let x = x0;
  const y = y0 + BIOME_IDS.length * cell;
  for (let v = 0; v < PLANT_VARIANTS; v++, x += cell) ctx.drawImage(d.plants, v * TS, CAVE_ROW * TS, TS, TS, x, y, TS * z, TS * z);
  ctx.drawImage(d.chest, 0, 0, TS, TS, x + 8, y, TS * z, TS * z);
  ctx.drawImage(d.snow, 0, 0, TS * 4, SNOW_H, x + cell + 16, y, TS * 4 * z, SNOW_H * z);
}

/** Night sky stops (same layout as SKY entries). */
export const NIGHT_SKY: [string, string, string, string] = ['#020309', '#080b1e', '#1c1d3c', '#05060f'];

/** Linear blend of two #rrggbb colours (t = 0 gives a, 1 gives b). */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const k = Math.min(1, Math.max(0, t));
  const c = (x: number, y: number): string => Math.round(x + (y - x) * k).toString(16).padStart(2, '0');
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}
