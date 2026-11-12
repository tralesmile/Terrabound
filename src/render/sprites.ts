import { hash2 } from '../sim/rng';
import { T, TILES } from '../sim/tiles';
import type { EnemyKind } from '../sim/enemies';
import { drawIcon } from './icons';
import { drawBossArt } from './bossart';
import type { BossId } from '../sim/bosses';
import { EDGE_E, EDGE_N, EDGE_S, EDGE_W, MASKS, edgeMask, edgePixel, growsMoss } from './autotile';

/** Tile size in logical pixels. All art is generated in code: zero asset files, zero asset cost, tiny bundle. */
export const TS = 16;
export const VARIANTS = 4;

interface Look {
  base: string;
  light: string;
  dark: string;
  speck?: string;
  speckCount?: number;
  /** Bright pixel on each speck (ore glint). */
  glint?: string;
  detail?: 'rivets' | 'flakes' | 'cracks' | 'frame' | 'pad' | 'bricks' | 'facets' | 'ripples' | 'roots';
  /** Built-metal frame on exposed sides: bright band, inner shadow line, a bolt in each exposed corner. */
  trim?: Trim;
}

export interface Trim {
  hi: string;
  lo: string;
  bolt: string;
}

const LOOK: Record<number, Look> = {
  [T.RUST]: { base: '#7a4a3a', light: '#935c48', dark: '#5f382c', detail: 'flakes' },
  [T.METAL]: { base: '#4a5568', light: '#5d6a80', dark: '#384154', detail: 'rivets', trim: { hi: '#8e98b0', lo: '#2c3444', bolt: '#c8d0dc' } },
  [T.IRON]: { base: '#4a5568', light: '#5d6a80', dark: '#384154', speck: '#d6c7b8', speckCount: 7, glint: '#fff6e8' },
  [T.COPPER]: { base: '#4a5568', light: '#5d6a80', dark: '#384154', speck: '#e08a3c', speckCount: 7, glint: '#ffd0a0' },
  [T.BEDROCK]: { base: '#1a1d29', light: '#252938', dark: '#101219', detail: 'cracks' },
  [T.SCAFFOLD]: { base: '#3b4658', light: '#7d8da6', dark: '#2a3242', speck: '#c9a35a', speckCount: 0, detail: 'frame' },
  [T.PAD]: { base: '#2b3a4a', light: '#36e0e8', dark: '#1d2733', detail: 'pad' },
  [T.SOIL]: { base: '#4a3a2a', light: '#5e4a34', dark: '#33281d', speck: '#3f6a34', speckCount: 3, detail: 'roots' },
  [T.ASH]: { base: '#4a4446', light: '#5e5759', dark: '#343032', speck: '#ff8a3c', speckCount: 1, detail: 'ripples' },
  [T.FROST]: { base: '#5a7390', light: '#7f9ab8', dark: '#41566e', speck: '#cfe8ff', speckCount: 3, detail: 'cracks' },
  [T.SAND]: { base: '#6a5a8a', light: '#8272a6', dark: '#4e4268', speck: '#d8b8ff', speckCount: 4, detail: 'ripples' },
  [T.CRYSTAL]: { base: '#3a2a5e', light: '#8a5fd6', dark: '#261c40', detail: 'facets' },
  [T.RUIN]: { base: '#3d4152', light: '#525870', dark: '#2a2d3a', detail: 'bricks' },
  [T.CIRCUIT]: { base: '#1f3a2a', light: '#2f5a3e', dark: '#142a1e', speck: '#c9a35a', speckCount: 3, detail: 'frame' },
  [T.CIRCUIT_ORE]: { base: '#1f3a2a', light: '#ffe08a', dark: '#142a1e', speck: '#ffcf4a', speckCount: 6, glint: '#ffffff', detail: 'facets' },
  [T.PLASMA_ROCK]: { base: '#3a1a22', light: '#5a2a34', dark: '#260e16', speck: '#ff5a8a', speckCount: 2, detail: 'cracks' },
  [T.PLASMA_ORE]: { base: '#3a1a22', light: '#ff9ab8', dark: '#260e16', speck: '#ff5a8a', speckCount: 6, glint: '#ffffff', detail: 'facets' },
  [T.CORE_ROCK]: { base: '#1e1028', light: '#2e1a3e', dark: '#12081a', speck: '#9a2aa8', speckCount: 2, detail: 'cracks' },
  [T.CORE_ORE]: { base: '#1e1028', light: '#ff9aff', dark: '#12081a', speck: '#ff5aff', speckCount: 6, glint: '#ffffff', detail: 'facets' },
  [T.BASALT]: { base: '#24232b', light: '#3a3842', dark: '#141319', speck: '#ff6028', speckCount: 1, detail: 'cracks' },
  [T.REINFORCED]: { base: '#3f4a5e', light: '#8a9ab8', dark: '#262d3c', speck: '#ffb03a', speckCount: 2, glint: '#e6eeff', detail: 'rivets', trim: { hi: '#b8c4dc', lo: '#1e2430', bolt: '#ffb03a' } },
  [T.SHIELD]: { base: '#1d4a66', light: '#5ad8ff', dark: '#10283a', speck: '#c8f6ff', speckCount: 4, glint: '#ffffff', detail: 'rivets' },
  [T.GATE]: { base: '#0b2a3a', light: '#36e0e8', dark: '#061620', speck: '#c8ffff', speckCount: 4, detail: 'pad' },
  [T.WRECK]: { base: '#3a3f4a', light: '#6b7080', dark: '#22252c', speck: '#e8a33d', speckCount: 2, glint: '#36e0e8', detail: 'rivets' },
};

const OUTLINE = '#161a24';

/** Base texture of one tile variant as TS*TS colours (null = transparent). Pure apart from hash2. */
export function tileTexture(id: number, v: number): (string | null)[] {
  const look = LOOK[id];
  const px: (string | null)[] = new Array(TS * TS).fill(look ? look.base : null);
  if (!look) return px;
  const put = (x: number, y: number, c: string): void => {
    if (x >= 0 && y >= 0 && x < TS && y < TS) px[y * TS + x] = c;
  };
  for (let y = 0; y < TS; y++) {
    for (let x = 0; x < TS; x++) {
      const h = hash2(x + v * 31, y + id * 17, 1234);
      if (h > 0.88) put(x, y, look.light);
      else if (h < 0.08) put(x, y, look.dark);
    }
  }
  switch (look.detail) {
    case 'rivets':
      if (v % 2 === 0) {
        for (const [rx, ry] of [[3, 3], [12, 3], [3, 12], [12, 12]]) {
          put(rx, ry, '#8e98b0');
          put(rx + 1, ry + 1, look.dark);
        }
      } else if (v === 1) {
        for (let x = 0; x < TS; x++) {
          put(x, 7, look.dark);
          put(x, 8, look.light);
        }
      }
      break;
    case 'flakes':
      for (let i = 0; i < 4; i++) {
        const fx = 2 + Math.floor(hash2(i, v, 41) * 11);
        const fy = 2 + Math.floor(hash2(v, i, 43) * 11);
        put(fx, fy, '#a8705a');
        put(fx + 1, fy, '#a8705a');
        put(fx, fy + 1, look.dark);
        put(fx + 1, fy + 1, look.dark);
      }
      break;
    case 'cracks': {
      let cx = 3 + Math.floor(hash2(v, 5, 77) * 10);
      for (let y = 2; y < 14; y++) {
        put(cx, y, look.dark);
        if (hash2(y, v, 78) > 0.5) cx += hash2(y, v, 79) > 0.5 ? 1 : -1;
      }
      break;
    }
    case 'frame':
      for (let i = 0; i < TS; i++) {
        put(i, 1, look.light);
        put(1, i, look.light);
        put(i, TS - 2, look.dark);
        put(TS - 2, i, look.dark);
        put(i, i, '#55627a');
        put(TS - 1 - i, i, '#55627a');
      }
      put(7, 7, '#c9a35a');
      put(8, 8, '#c9a35a');
      break;
    case 'bricks':
      for (let y = 0; y < TS; y++) {
        const row = Math.floor(y / 4);
        for (let x = 0; x < TS; x++) {
          if (y % 4 === 3) put(x, y, look.dark);
          else if ((x + (row % 2) * 4 + v) % 8 === 0) put(x, y, look.dark);
          else if (y % 4 === 0) put(x, y, look.light);
        }
      }
      if (v === 3) for (let i = 0; i < 4; i++) put(6 + i, 9 + (i % 2), '#4f9a3f');
      break;
    case 'facets': {
      // Two or three bright crystal prisms in dark matrix.
      const n = 2 + (v % 2);
      for (let k = 0; k < n; k++) {
        const cx = 3 + Math.floor(hash2(k, v, 71) * 10);
        const cy = 3 + Math.floor(hash2(v, k, 73) * 9);
        for (let i = 0; i < 5; i++) {
          put(cx, cy + i, look.light);
          put(cx + 1, cy + i, i < 2 ? '#e8d8ff' : '#b08ae8');
          if (i > 1) put(cx - 1, cy + i, '#6a48b0');
        }
        put(cx, cy - 1, '#ffffff');
      }
      break;
    }
    case 'ripples':
      for (let y = 3; y < TS; y += 5) for (let x = 0; x < TS; x++) if (hash2(x >> 2, y, v + 81) > 0.35) put(x, y + ((x >> 3) & 1), look.light);
      break;
    case 'roots':
      for (let i = 0; i < 2; i++) {
        let rx = 3 + Math.floor(hash2(i, v, 83) * 10);
        for (let y = 0; y < 9; y++) {
          put(rx, y, '#6b4a2e');
          if (hash2(y, i + v, 84) > 0.6) rx += hash2(y, v, 85) > 0.5 ? 1 : -1;
        }
      }
      break;
    case 'pad':
      for (let x = 1; x < TS - 1; x++) {
        put(x, 1, look.light);
        put(x, 2, look.light);
      }
      put(3 + (v % 2) * 6, 6, '#ffcf4a');
      put(4 + (v % 2) * 6, 6, '#ffcf4a');
      put(3 + (v % 2) * 6, 7, '#ffcf4a');
      put(4 + (v % 2) * 6, 7, '#ffcf4a');
      break;
  }
  if (look.speck) {
    for (let i = 0; i < (look.speckCount ?? 0); i++) {
      const x = 2 + Math.floor(hash2(i, v, id * 91) * 11);
      const y = 2 + Math.floor(hash2(v, i, id * 57) * 11);
      put(x, y, look.speck);
      put(x + 1, y, look.speck);
      put(x, y + 1, look.speck);
      put(x + 1, y + 1, look.dark);
      if (look.glint && i % 2 === 0) put(x, y, look.glint);
    }
  }
  return px;
}

/** Texture plus autotile edges for one neighbour mask. */
export function autotilePixels(id: number, v: number, mask: number): (string | null)[] {
  const look = LOOK[id];
  const px = tileTexture(id, v);
  if (!look) return px;
  for (let y = 0; y < TS; y++) {
    for (let x = 0; x < TS; x++) {
      const e = edgePixel(mask, x, y, TS);
      if (e === 'x') px[y * TS + x] = null;
      else if (e === 'o') px[y * TS + x] = OUTLINE;
      else if (e === 'l') px[y * TS + x] = look.light;
      else if (e === 'd') px[y * TS + x] = look.dark;
    }
  }
  if (look.trim) applyTrim(px, mask, look.trim);
  return px;
}

/** Look of a block id, for tests and the gallery. */
export function tileTrim(id: number): Trim | undefined {
  return LOOK[id]?.trim;
}

/**
 * Frames the exposed sides of a built block so walls read as architecture, not rock: a bright band
 * one pixel in on top/left, a lip on bottom/right, a shadow line inside it, bolts in exposed corners.
 */
function applyTrim(px: (string | null)[], mask: number, t: Trim): void {
  const L = TS - 1;
  const set = (x: number, y: number, c: string): void => {
    if (px[y * TS + x] !== null && px[y * TS + x] !== OUTLINE) px[y * TS + x] = c;
  };
  for (let i = 1; i < L; i++) {
    if (mask & EDGE_N) {
      set(i, 1, t.hi);
      set(i, 2, t.lo);
    }
    if (mask & EDGE_W) {
      set(1, i, t.hi);
      set(2, i, t.lo);
    }
    if (mask & EDGE_S) set(i, L - 2, t.lo);
    if (mask & EDGE_E) set(L - 2, i, t.lo);
  }
  const corners: [number, number, number][] = [
    [EDGE_N | EDGE_W, 3, 3],
    [EDGE_N | EDGE_E, L - 4, 3],
    [EDGE_S | EDGE_W, 3, L - 4],
    [EDGE_S | EDGE_E, L - 4, L - 4],
  ];
  for (const [m, x, y] of corners) {
    if ((mask & m) !== m) continue;
    set(x, y, t.bolt);
    set(x + 1, y + 1, t.lo);
  }
}

/** Atlas column for a variant and neighbour mask. */
export function atlasCol(v: number, mask: number): number {
  return mask * VARIANTS + v;
}

export const TILE_COLORS: Record<number, string> = {
  [T.RUST]: '#935c48',
  [T.METAL]: '#6c7a92',
  [T.IRON]: '#d6c7b8',
  [T.COPPER]: '#e08a3c',
  [T.BEDROCK]: '#252938',
  [T.PAD]: '#36e0e8',
  [T.TORCH]: '#ffb03a',
  [T.LADDER]: '#c9a35a',
  [T.SCAFFOLD]: '#7d8da6',
  [T.PLATFORM]: '#9fb0c8',
  [T.DOOR]: '#6fa8c9',
  [T.WALL]: '#3a4356',
  [T.SOIL]: '#5e4a34',
  [T.ASH]: '#5e5759',
  [T.FROST]: '#9fcbe8',
  [T.SAND]: '#8272a6',
  [T.CRYSTAL]: '#c08cff',
  [T.RUIN]: '#525870',
  [T.TRUNK]: '#6b4a2e',
  [T.LEAVES]: '#4f9a3f',
  [T.PLANT]: '#7fcf5a',
  [T.CHEST]: '#c9a35a',
  [T.TERMINAL]: '#36e0e8',
  [T.WRECK]: '#e8a33d',
  [T.WATER]: '#2a82dc',
  [T.CIRCUIT]: '#2f5a3e',
  [T.CIRCUIT_ORE]: '#ffcf4a',
  [T.PLASMA_ROCK]: '#5a2a34',
  [T.PLASMA_ORE]: '#ff5a8a',
  [T.CORE_ROCK]: '#2e1a3e',
  [T.CORE_ORE]: '#ff5aff',
  [T.GATE]: '#36e0e8',
  [T.ACID_POOL]: '#7fff4a',
  [T.MAGMA]: '#ff6028',
  [T.BASALT]: '#3a3842',
  [T.TURRET]: '#ff6a4a',
  [T.SPIKES]: '#c9d0e4',
  [T.REINFORCED]: '#8a9ab8',
  [T.SHIELD]: '#5ad8ff',
  [T.TABLE]: '#a07a4a',
  [T.LAMP]: '#ffe08a',
  [T.SCREEN]: '#36e0e8',
  [T.POT_PLANT]: '#5ac85a',
  [T.BANNER]: '#e04a5a',
  [T.BED]: '#6a8ad8',
  [T.BED_FOOT]: '#6a8ad8',
  [T.TABLE_END]: '#a07a4a',
  [T.CHAIR]: '#c9a35a',
  [T.WINDOW]: '#9fd8ff',
  [T.LIFT]: '#5ad8ff',
};

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function hexRgb(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Atlas: one row per tile id; columns are MASKS x VARIANTS autotile cells (see atlasCol). */
export function buildAtlas(): HTMLCanvasElement {
  const cols = MASKS * VARIANTS;
  const canvas = makeCanvas(TS * cols, TS * TILES.length);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const img = ctx.createImageData(canvas.width, canvas.height);
  const cache = new Map<string, [number, number, number]>();
  for (let id = 1; id < TILES.length; id++) {
    if (!LOOK[id]) continue;
    for (let mask = 0; mask < MASKS; mask++) {
      for (let v = 0; v < VARIANTS; v++) {
        const px = autotilePixels(id, v, mask);
        const ox = atlasCol(v, mask) * TS;
        const oy = id * TS;
        for (let i = 0; i < px.length; i++) {
          const c = px[i];
          if (!c) continue;
          let rgb = cache.get(c);
          if (!rgb) cache.set(c, (rgb = hexRgb(c)));
          const o = ((oy + Math.floor(i / TS)) * canvas.width + ox + (i % TS)) * 4;
          img.data[o] = rgb[0];
          img.data[o + 1] = rgb[1];
          img.data[o + 2] = rgb[2];
          img.data[o + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Back-wall looks by wall id (W in world.ts): dark, low-contrast so the foreground reads first. */
const WALL_LOOK: Record<number, Look> = {
  1: { base: '#2e2026', light: '#3a2a2f', dark: '#22171c', detail: 'flakes' },
  2: { base: '#1e2230', light: '#272c3c', dark: '#161923', detail: 'cracks' },
  3: { base: '#2f3748', light: '#3d475c', dark: '#232a38', detail: 'rivets' },
};
export const WALL_KINDS = 4;

/** One wall variant as TS*TS colours (null for W.NONE). Panels get a bevel so built rooms read as rooms. */
export function wallTexture(wall: number, v: number): (string | null)[] {
  const look = WALL_LOOK[wall];
  if (!look) return new Array(TS * TS).fill(null);
  const px: string[] = new Array(TS * TS).fill(look.base);
  const put = (x: number, y: number, c: string): void => {
    if (x >= 0 && y >= 0 && x < TS && y < TS) px[y * TS + x] = c;
  };
  for (let y = 0; y < TS; y++) {
    for (let x = 0; x < TS; x++) {
      const h = hash2(x + v * 13, y + wall * 29, 4321);
      if (h > 0.9) put(x, y, look.light);
      else if (h < 0.1) put(x, y, look.dark);
    }
  }
  if (look.detail === 'flakes') {
    for (let i = 0; i < 3; i++) put(2 + Math.floor(hash2(i, v, 51) * 12), 2 + Math.floor(hash2(v, i, 53) * 12), look.light);
  } else if (look.detail === 'cracks') {
    let cx = 3 + Math.floor(hash2(v, 7, 61) * 10);
    for (let y = 0; y < TS; y++) {
      put(cx, y, look.dark);
      if (hash2(y, v, 62) > 0.6) cx += hash2(y, v, 63) > 0.5 ? 1 : -1;
    }
  } else if (look.detail === 'rivets') {
    for (let i = 0; i < TS; i++) {
      put(i, 0, look.light);
      put(0, i, look.light);
      put(i, TS - 1, look.dark);
      put(TS - 1, i, look.dark);
    }
    for (const [rx, ry] of [[2, 2], [13, 2], [2, 13], [13, 13]]) put(rx, ry, '#566077');
  }
  return px;
}

export function buildWallAtlas(): HTMLCanvasElement {
  const c = makeCanvas(TS * VARIANTS, TS * WALL_KINDS);
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  for (let wl = 1; wl < WALL_KINDS; wl++) {
    for (let v = 0; v < VARIANTS; v++) {
      const px = wallTexture(wl, v);
      for (let i = 0; i < px.length; i++) {
        const col = px[i];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(v * TS + (i % TS), wl * TS + Math.floor(i / TS), 1, 1);
      }
    }
  }
  return c;
}

/** Lichen strips for exposed surface tops: VARIANTS cells of TS x MOSS_H, drips hang down. */
export const MOSS_H = 5;
export function mossPixels(v: number): (string | null)[] {
  const px: (string | null)[] = new Array(TS * MOSS_H).fill(null);
  for (let x = 0; x < TS; x++) {
    px[x] = hash2(x, v, 301) > 0.5 ? '#7fd36a' : '#4f9a3f';
    px[TS + x] = '#4f9a3f';
    const drip = Math.floor(hash2(x, v, 302) * 6) - 2;
    for (let y = 2; y < 2 + drip && y < MOSS_H; y++) px[y * TS + x] = y === 1 + drip ? '#2f6a34' : '#4f9a3f';
  }
  return px;
}

export function buildMoss(): HTMLCanvasElement {
  const c = makeCanvas(TS * VARIANTS, MOSS_H);
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  for (let v = 0; v < VARIANTS; v++) {
    const px = mossPixels(v);
    for (let i = 0; i < px.length; i++) {
      const col = px[i];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(v * TS + (i % TS), Math.floor(i / TS), 1, 1);
    }
  }
  return c;
}

/** Cave backdrop so tunnels read as depth, not as the sky. */
export function buildBackdrop(): HTMLCanvasElement {
  const c = makeCanvas(TS * 2, TS * 2);
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.fillStyle = '#17141f';
  ctx.fillRect(0, 0, c.width, c.height);
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const h = hash2(x, y, 777);
      if (h > 0.9) {
        ctx.fillStyle = '#1f1b2b';
        ctx.fillRect(x, y, 1, 1);
      } else if (h < 0.06) {
        ctx.fillStyle = '#100e17';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  return c;
}

/** Palette-indexed pixel maps. Rows are right-padded with transparent pixels to the sprite width. */
export const PAL: Record<string, string> = {
  o: '#161a24',
  h: '#d9dde8',
  H: '#8e98b0',
  v: '#1fb8c0',
  V: '#c6fbff',
  s: '#e8a33d',
  S: '#b87a1f',
  p: '#3a4356',
  P: '#566077',
  b: '#36e0e8',
  l: '#2b2f3a',
  L: '#4a5266',
  g: '#c47f1f',
  e: '#ff4a3a',
  E: '#ffd0a0',
  c: '#d9663a',
  C: '#8f3d22',
  d: '#f0a070',
  m: '#6d4bd0',
  M: '#b48aff',
  w: '#ffffff',
  a: '#5aa6ff',
  A: '#2f64b4',
  n: '#b4dcff',
  y: '#ffe68a',
  Y: '#ff7a3c',
};

export const PLAYER_W = 16;
export const PLAYER_H = 24;

const HEAD = [
  '     oooooo',
  '    ohhhhhHo',
  '   ohhhhhhhHo',
  '   ohhhvvvvvo',
  '   ohhhvVVVvo',
  '   ohhhvvvvvo',
  '   oHhhhhhhHo',
  '    oooooooo',
];
const TORSO = [
  '  ooosssssso',
  ' oppossssSso',
  ' opbosssSSsog',
  ' opbosssSSSgo',
  ' oppoSSSSSSo',
  '  oooooooooo',
];
const LEGS: Record<string, string[]> = {
  stand: ['    olllLlo', '    olllLlo', '    olo olo', '    olo olo', '    olo olo', '    olo olo', '   olLo olLo', '   oooo oooo'],
  runA: ['    olllLlo', '   olllo oLlo', '  olLo   olo', '  olo    olo', ' olLo     olLo', ' olo       olo', 'olLo       olLo', 'oooo       oooo'],
  runB: ['    olllLlo', '    olo olo', '    olo olo', '    olo olo', '    olo olo', '   olLo olLo', '   oooo oooo', ''],
  runC: ['    olllLlo', '    olLollo', '    ollo olo', '    olo  olo', '    olo  olo', '    olLo olLo', '    oooo oooo', ''],
  climbA: ['    olllLlo', '    olo olo', '    olLo olo', '    olo  olLo', '    olo olo', '    oLo olo', '    ooo ooo', ''],
  climbB: ['    olllLlo', '    olo olo', '    olo olLo', '    olLo olo', '    olo  olo', '    olo oLo', '    ooo ooo', ''],
  jump: ['    olllLlo', '   ollo ollo', '   olo   olo', '   olLo  olLo', '   oooo  oooo', '', '', ''],
  fall: ['    olllLlo', '    olo olo', '    olo olo', '    olLo olLo', '    oooo oooo', '', '', ''],
};

export type PlayerFrame = 'stand' | 'runA' | 'runB' | 'runC' | 'jump' | 'fall' | 'climbA' | 'climbB';
export const PLAYER_FRAMES: PlayerFrame[] = ['stand', 'runA', 'runB', 'runC', 'jump', 'fall', 'climbA', 'climbB'];

/** Suit colours by armor tier (0-3+): shirt, shade. */
export const SUIT_TIERS: [string, string][] = [
  ['#e8a33d', '#b87a1f'],
  ['#7fd36a', '#4f9a3f'],
  ['#5aa6ff', '#3a70c0'],
  ['#d98aff', '#9a52c8'],
];

/** Full player sprite rows (24 rows) for a frame. */
export function playerRows(frame: PlayerFrame, bob = 0): string[] {
  const rows = [...HEAD, ...TORSO, ...LEGS[frame]];
  while (rows.length < PLAYER_H) rows.push('');
  // Breathing / run bob: shift head+torso down by `bob` rows, legs stay planted.
  if (bob > 0) {
    const upper = rows.slice(0, 14);
    return [...Array(bob).fill(''), ...upper, ...rows.slice(14 + bob)].slice(0, PLAYER_H);
  }
  return rows.slice(0, PLAYER_H);
}

const CRAWLER_BODY = [
  '    ooooooo',
  '  oodddccccoo o',
  ' odcccccccCCoo',
  'occcccccccCCoooo',
  'occcccccccColeeo',
  'oCcccccccCColEeo',
  ' oCCCCCCCCCooooo',
  '  ooooooooooo',
];
const CRAWLER_LEGS = [
  ['  o  o   o  o', ' o  o   o  o'],
  ['  o  o   o  o', '  o  o   o  o'],
  ['  o  o   o  o', '   o  o   o  o'],
  ['  o  o   o  o', '  o  o   o  o'],
];
/** Scrap crawler: beetle shell, head with glowing eye on the right, 4-step scuttle. 16x10. */
export const CRAWLER_ROWS: string[][] = CRAWLER_LEGS.map((legs) => [...CRAWLER_BODY, ...legs]);

const FLYER_BODY = ['  oooommoooo', '    ommMmmo', '    omeemmo', '    ommmmmo', '     oooooo', '      oo'];
const ROTORS = ['wwwwwo    owwwww', '  wwwo    owww', '     o    o'];
/** Drone wisp: rotor spins over 3 frames; the eye blinks via a remap at draw time. 16x7. */
export const FLYER_ROWS: string[][] = ROTORS.map((r) => [r, ...FLYER_BODY]);

/** Field drone hull (16 wide): mast, eye band in the job colour (`e` remapped), plated belly. */
const DRONE_HULL = [
  '       oo',
  '   oooooooooo',
  '  oHhhhhhhhhHo',
  ' oHhoeeeeeeohHo',
  ' oPppoooooopppPo',
  '  oPPPPPPPPPPPo',
  '   oooooooooooo',
];
const DRONE_ROTORS = [' wwwwwo  owwwww', '    wwwo  owww'];
/** Job attachments under the hull: drill bit, twin barrels, cargo claws, repair emitter. */
const DRONE_TOOLS: Record<string, string[]> = {
  miner: ['      osSo', '       sSo', '       oo'],
  guard: ['    oLLo  oLLo', '    oLo    oLo', '     o      o'],
  hauler: ['   oPo     oPo', '   oPoo   ooPo', '    ooo   ooo'],
  repair: ['      oVVVo', '       oVo', '        o'],
  home: [],
};
export const DRONE_W = 16;

/** Rows for a field drone doing `act` at time t (rotor spins at 24 fps). Pure. */
export function droneRows(act: string, t: number): string[] {
  const rotor = DRONE_ROTORS[Math.floor(Math.max(0, t) * 24) % DRONE_ROTORS.length];
  return [rotor, ...DRONE_HULL, ...(DRONE_TOOLS[act] ?? [])];
}

/** Trader robot (14 wide, 20 tall, facing right): antenna light, screen face, gold merchant vest, coin badge. */
const TRADER_TOP = [
  '      oyo',
  '       o',
  '   ooooooooo',
  '  oHhhhhhhhhHo',
  '  ohoooooooohHo',
  '  ohobbooobbhHo',
  '  ohoooooooohHo',
  '  ohoooEEoooho',
  '  oHhhhhhhhhHo',
  '   ooooooooooo',
  '     oPPPPo',
  '  oooggggggooo',
  ' oPogSSSSSSgoPo',
  ' oPogSyyyySgoPo',
  ' oHogSSyySSgoHo',
  '  oogggggggoo',
  '    oPPPPPPo',
];
const TRADER_LEGS = [
  ['    oLLooLLo', '    oLLooLLo', '   ooooooooo'],
  ['   oLLo  oLLo', '  oLLo    oLLo', ' oooo     oooo'],
  ['    oLLooLLo', '     oLLLLo', '    oooooo'],
];
export const TRADER_W = 15;

/** Rows for the trader at time t: legs cycle while walking, eyes blink, the antenna blinks. Pure. */
export function traderRows(t: number, walking: boolean): string[] {
  const k = Math.max(0, t);
  const legs = walking ? TRADER_LEGS[1 + (Math.floor(k * 8) % 2)] : TRADER_LEGS[0];
  const blink = k % 3.2 > 3.05;
  const top = TRADER_TOP.map((r, i) => (i === 5 && blink ? r.replace(/b/g, 'o') : i === 0 && k % 1 > 0.5 ? r.replace('y', 'Y') : r));
  return [...top, ...legs];
}

/** Medic colours over the trader rig: white coat, red cross and beacon, teal trim. */
export const MEDIC_REMAP: Record<string, string> = { g: '#eef2f8', y: '#e8343a', Y: '#ff9a9a', P: '#2fb8b0', S: '#c8d0dc' };

/** Rows for the Medic: the trader rig with a red cross on the chest plate. Pure. */
export function medicRows(t: number, walking: boolean): string[] {
  const rows = traderRows(t, walking);
  rows[12] = ' oPogSSyySSgoPo';
  rows[13] = ' oPogSyyyySgoPo';
  rows[14] = ' oHogSSyySSgoHo';
  return rows;
}

/** Gunsmith colours over the trader rig: gunmetal apron, orange trim and amber visor (V), chip badge. */
export const GUNSMITH_REMAP: Record<string, string> = { g: '#5d6470', y: '#ff9a3c', Y: '#ffd8a8', P: '#ff9a3c', S: '#343944', V: '#ffb23a' };

/** Rows for the Gunsmith: the trader rig with a welding visor and a mod chip on the chest. Pure. */
export function gunsmithRows(t: number, walking: boolean): string[] {
  const rows = traderRows(t, walking);
  rows[5] = '  ohoVVVVVVVhHo';
  rows[12] = ' oPogSyyyySgoPo';
  rows[13] = ' oPogSySSySgoPo';
  rows[14] = ' oHogSyyyySgoHo';
  return rows;
}

/** Scientist colours over the trader rig: lavender lab coat, green goggle lenses (G) and a bubbling flask. */
export const SCIENTIST_REMAP: Record<string, string> = { g: '#d8cff0', y: '#7dffb0', Y: '#d8ffe8', P: '#9a6ae8', S: '#b0a6cc', G: '#5aff9a' };

/** Rows for the Scientist: the trader rig with round goggles and a flask on the chest; the flask bubbles. Pure. */
export function scientistRows(t: number, walking: boolean): string[] {
  const rows = traderRows(t, walking);
  rows[5] = '  ohoGGoooGGhHo';
  const bub = Math.floor(Math.max(0, t) * 3) % 2 === 0;
  rows[12] = bub ? ' oPogSSYSSSgoPo' : ' oPogSSSYSSgoPo';
  rows[13] = ' oPogSyyyySgoPo';
  rows[14] = ' oHogyyyyyygoHo';
  return rows;
}

export type RobotKind = 'trader' | 'medic' | 'gunsmith' | 'scientist';

/** Standing rows for any room robot. Pure. */
export function robotRows(kind: RobotKind, t: number, walking: boolean): string[] {
  return (kind === 'medic' ? medicRows : kind === 'gunsmith' ? gunsmithRows : kind === 'scientist' ? scientistRows : traderRows)(t, walking);
}

/** Merchant drone colours over the field-drone hull: gold plating, cyan eye band. */
export const MERCHANT_REMAP: Record<string, string> = { P: '#ffd23a', p: '#b8862a', e: '#5ad8ff', H: '#c99a2a', h: '#ffe8a0' };
/** Cargo crate the merchant carries under its claws (11 px wide). */
export const MERCHANT_CRATE = ['   oPo   oPo', '  ooooooooooo', '  oCCCCCCCCCo', '  oCcCcCcCcCo', '  oCCCCCCCCCo', '  ooooooooooo'];

/** Hop height in art px for a reaction with `left` seconds to go: a cheer bounces, a wave hops once. Pure. */
export function npcHop(react: 'wave' | 'cheer', left: number): number {
  if (left <= 0) return 0;
  if (react === 'cheer') return Math.abs(Math.sin(left * 9)) * 4;
  const k = Math.max(0, left - 1.1);
  return k > 0 ? Math.sin((k / 0.5) * Math.PI) * 3 : 0;
}

/** Bent legs for a robot sitting on a chair (thighs forward over the seat, shins down to the floor). */
const SIT_LEGS = ['    oLLLLLLLLLo', '    ooooooooLLo', '           oLLo', '           oLLo', '          ooooo'];
/** Rows of a robot sitting (facing right): top half of its standing rig over bent legs. Pure. */
export function npcSitRows(kind: RobotKind, t: number): string[] {
  const rows = robotRows(kind, t, false);
  return [...rows.slice(0, TRADER_TOP.length), ...SIT_LEGS];
}

/** Rows of a robot's head peeking out of bed: eyes shut and antenna dimmed, or wide awake in a raid. Pure. */
export function npcBedHeadRows(awake: boolean): string[] {
  // Shut eyes are dim slits ('q', remapped by the renderer to a dark teal).
  return TRADER_TOP.slice(0, 10).map((r, i) => (i === 5 && !awake ? r.replace(/b/g, 'q') : i === 0 && !awake ? r.replace('y', 'o') : r));
}

/** Blanket mound over a sleeping robot, `w` px wide (palette chars a/b/e, remapped by the renderer). Pure. */
export function blanketRows(w: number): string[] {
  const n = Math.max(6, w);
  return [
    '  ' + 'o'.repeat(n - 4) + '  ',
    ' o' + 'b'.repeat(n - 4) + 'o ',
    'o' + 'a'.repeat(n - 3) + 'bo',
    'o' + 'a'.repeat(n - 2) + 'o',
    'o' + 'e'.repeat(n - 2) + 'o',
  ];
}

/**
 * Vehicle sprite maps, nose/handlebar facing right (flip for left). Rows are top-down; the
 * renderer puts row 0 `VEHICLES[id].top` art px above the player's feet.
 */
const SKY_JET = [
  '  oo',
  '  oAo',
  '  oaAo           oooooo',
  '  oaaAo        ooVVVVwVoo',
  '  oaaaAoooooooooVVVVVVVVVoooo',
  ' oonnnnnnnnnnnnnnnnnnnnnnnnnnoo',
  'oLaaaaaaaaaaaaaaaaaaaaaaaaaaaaaoo',
  'oLaaaaaaaaaaaaaaaaaaaaaaaaaaaaawwo',
  ' ooAAAAAAAAAAAAAAAAAAAAAAAAAAAAoo',
  '   ooooAAAAAAAAAAAAAAAAAAAAoooo',
  '        ooAAAAAAAAAAAAAoo',
  '          ooooooooooooo',
];
const HOVERBIKE = [
  '                    oo',
  '                   oLo',
  '  ooooooooooooooooooLoooo',
  ' osssssssssssssssssssssbbo',
  'oSssssssssssssssssssssssso',
  'oSSSSSSSSSSSSSSSSSSSSSSSo',
  ' oolllllllllllllllllllloo',
];
const HOVER_GLOW = ['    obbbo        obbbo', '     oVo          oVo', '     obo          obo'];
const JET_FLAME = [
  ['Y', 'yY'],
  ['YYy', 'yyYYY'],
  ['Yy', 'YyyY'],
];

/** Dune buggy: roll cage, red body, two big wheels (spokes turn with time). */
const BUGGY = [
  '       oooooooooo',
  '      oL        Lo',
  '     oL          Lo',
  '  oooLoooooooooooLoooooo',
  ' oaaaaaaaaaaaaaaaaaaaaaaoo',
  'oAaaaaaaaaaaaaaaaaaaaaaaawo',
  'oAAAAAAAAAAAAAAAAAAAAAAAAAo',
  ' ooooooooooooooooooooooooo',
];
const WHEEL_A = [' oooo ', 'oLnnLo', 'onLLno', 'onLLno', 'oLnnLo', ' oooo '];
const WHEEL_B = [' oooo ', 'onLLno', 'oLnnLo', 'oLnnLo', 'onLLno', ' oooo '];
/** Drill tank: armored hull, tread band and a striped drill cone at the front. */
const DRILL_TANK = [
  '      oooooooooo',
  '     oaaaaaaaaaao',
  '    oaaVVVVaaaaaAo',
  '  ooaaaaaaaaaaaaAoooo',
  ' oaaaaaaaaaaaaaaaAoLLoo',
  'oAaaaaaaaaaaaaaaaaoLnLLoo',
  'oAAAAAAAAAAAAAAAAAoLLnLLLo',
  'onLnLnLnLnLnLnLnLnooLLnoo',
  'oLnLnLnLnLnLnLnLnLo ooo',
  ' oooooooooooooooooo',
];

export type VehicleSpriteId = 'hoverbike' | 'sky_jet' | 'buggy' | 'drill_tank';
export const VEHICLES: Record<VehicleSpriteId, { w: number; top: number }> = {
  hoverbike: { w: 26, top: 6 },
  sky_jet: { w: 37, top: 13 },
  buggy: { w: 27, top: 13 },
  drill_tank: { w: 26, top: 11 },
};
/** Body colours per vehicle (a = body, A = shade). */
export const VEHICLE_REMAP: Partial<Record<VehicleSpriteId, Record<string, string>>> = {
  buggy: { a: '#e85a3a', A: '#a8361f', L: '#c9d0e4', n: '#2b2f3a' },
  drill_tank: { a: '#7a8a5a', A: '#4e5a38', L: '#d6dde8', n: '#2b2f3a' },
};

/** Hull colour chars per vehicle: the hoverbike's body uses s/S, the others a/A. */
const HULL_CHARS: Record<VehicleSpriteId, [string, string]> = { hoverbike: ['s', 'S'], sky_jet: ['a', 'A'], buggy: ['a', 'A'], drill_tank: ['a', 'A'] };

/** Colour remap for a vehicle, with an earned hull paint (main, shade) over its own colours. Pure. */
export function vehicleRemap(id: VehicleSpriteId, paint?: readonly [string, string]): Record<string, string> | undefined {
  const base = VEHICLE_REMAP[id];
  if (!paint) return base;
  const [a, b] = HULL_CHARS[id];
  return { ...base, [a]: paint[0], [b]: paint[1] };
}

/**
 * Rows for a vehicle at time t: hover pads pulse, the jet's exhaust flickers (longer when boosting).
 * Flame columns sit left of the tail so they flip with the vehicle. Pure.
 */
export function vehicleRows(id: VehicleSpriteId, t: number, boost: boolean): string[] {
  const f = Math.floor(Math.max(0, t) * 20);
  if (id === 'buggy') {
    const wh = f % 2 ? WHEEL_A : WHEEL_B;
    // Wheels hang below the body under the rear and front axles.
    const rows = BUGGY.map((r) => r.padEnd(27));
    for (let i = 0; i < wh.length; i++) {
      const line = ' '.repeat(2) + wh[i] + ' '.repeat(11) + wh[i];
      if (i < 2) rows[rows.length - 2 + i] = overlay(rows[rows.length - 2 + i], line);
      else rows.push(line);
    }
    return rows;
  }
  if (id === 'drill_tank') {
    // The drill's stripes scroll; the tread band shifts every other frame.
    return DRILL_TANK.map((r, i) => (i >= 4 && i <= 6 && f % 2 ? r.replace(/Ln/g, 'nL') : i >= 7 && f % 2 ? r.replace(/Ln/g, 'nL') : r));
  }
  if (id === 'hoverbike') {
    const glow = HOVER_GLOW.slice(0, 1 + (f % 3));
    return [...HOVERBIKE, ...glow];
  }
  // Exhaust leaves the nozzle (rows 6 and 7) to the left, in a 3-column margin; boosting uses
  // the long flame frames.
  const flame = boost ? JET_FLAME[1 + (f % 2)] : JET_FLAME[0];
  const flick = boost || f % 2 === 0;
  return SKY_JET.map((r, i) => {
    const fl = i === 6 && flick ? flame[0] : i === 7 && flick ? flame[1] : '';
    return fl.slice(-3).padStart(3) + r;
  });
}

/** Paint `top` over `base` wherever `top` is not a space. */
function overlay(base: string, top: string): string {
  const n = Math.max(base.length, top.length);
  let out = '';
  for (let i = 0; i < n; i++) out += top[i] && top[i] !== ' ' ? top[i] : base[i] ?? ' ';
  return out;
}

export type EnemySpriteKind = 'crawler' | 'flyer';

/** Picks the animation frame for an enemy at time t. Pure. */
export function enemyFrame(kind: EnemySpriteKind, t: number): string[] {
  const frames = kind === 'crawler' ? CRAWLER_ROWS : FLYER_ROWS;
  const fps = kind === 'crawler' ? 10 : 24;
  return frames[Math.floor(Math.max(0, t) * fps) % frames.length];
}

export const ENEMY_W = 16;
/** Enemies draw at 0.8 of the player's art scale; one enemy art px in tiles. */
export const ENEMY_SCALE = 0.8;
export const ENEMY_ART_UNIT = ENEMY_SCALE / TS;

export interface DebrisPiece {
  /** Offset from the sprite's bottom-centre, in art px (y negative is up). */
  dx: number;
  dy: number;
  color: string;
}

/**
 * Splits a sprite into chunk x chunk art-px pieces, each coloured by its first
 * opaque pixel. Used for the death "shatter" so debris matches the enemy. Pure.
 */
export function spriteDebris(rows: string[], width: number, flip: boolean, chunk = 2): DebrisPiece[] {
  const out: DebrisPiece[] = [];
  const h = rows.length;
  for (let r0 = 0; r0 < h; r0 += chunk) {
    for (let c0 = 0; c0 < width; c0 += chunk) {
      let color: string | undefined;
      for (let r = r0; r < Math.min(h, r0 + chunk) && !color; r++) {
        for (let c = c0; c < c0 + chunk && !color; c++) color = PAL[rows[r][c] ?? ' '];
      }
      if (!color) continue;
      const cx = c0 + chunk / 2;
      out.push({ dx: (flip ? width - cx : cx) - width / 2, dy: (r0 + Math.min(h, r0 + chunk)) / 2 - h, color });
    }
  }
  return out;
}

export function drawRows(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  x: number,
  y: number,
  s: number,
  flip: boolean,
  width: number,
  tint?: string,
  remap?: Record<string, string>,
): void {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      const color = remap?.[ch] ?? PAL[ch];
      if (!color) continue;
      const cx = flip ? width - 1 - c : c;
      ctx.fillStyle = tint ?? color;
      ctx.fillRect(Math.round(x + cx * s), Math.round(y + r * s), Math.ceil(s), Math.ceil(s));
    }
  }
}

export interface PlayerPose {
  facing: number;
  walking: boolean;
  t: number;
  airborne: boolean;
  vy?: number;
  climbing?: boolean;
  hurt?: boolean;
  swing?: boolean;
  tier?: number;
  /** Visible gear: upgrade levels change helmet, visor, backpack, battery light and boots. */
  gear?: PlayerGear;
  /** Tool shown in the hand. */
  held?: string;
  /** Crafted armor colours (main, accent) that override the upgrade-tier look. */
  wear?: { head?: [string, string]; body?: [string, string]; feet?: [string, string] };
  /** Landing squash scale about the feet (1, 1 = none). */
  squash?: { sx: number; sy: number };
  /** Earned suit paint (main, shade): vanity, drawn over the armour tier and crafted body armour. */
  paint?: [string, string];
  /** Earned helmet paint (shell, shade): drawn over the lamp tier and a crafted helmet. */
  helm?: [string, string];
}

export interface PlayerGear {
  lamp: number;
  pick: number;
  pack: number;
  battery: number;
  boots: number;
}

const HELMETS: [string, string][] = [['#d9dde8', '#8e98b0'], ['#e6ebf2', '#9aa8bc'], ['#ffe08a', '#c9a35a'], ['#ffffff', '#c08cff']];
const VISORS: [string, string][] = [['#1fb8c0', '#c6fbff'], ['#2fd07a', '#c8ffd8'], ['#ff9a3c', '#ffe0b0'], ['#b06bff', '#f0d8ff']];
const PACKS = ['#3a4356', '#4a5a6e', '#5a4a2e', '#4a2e5a'];
const LIGHTS = ['#36e0e8', '#7dffb0', '#ffcf4a', '#ff7ab8'];
const BOOTS: [string, string][] = [['#2b2f3a', '#4a5266'], ['#3a2a1e', '#6b4a2e'], ['#1f4a8a', '#5aa6ff'], ['#5a2a1a', '#ff8a3c']];

/** Gear tier 0-3 from an upgrade level (every 2 levels is a visible step). */
export function gearTier(level: number): number {
  return Math.max(0, Math.min(3, Math.floor((level + 1) / 2)));
}

/** Colour remap for the player's sprite from gear and armor tier. */
export function gearRemap(gear: PlayerGear | undefined, tier: number): Record<string, string> {
  const [c1, c2] = SUIT_TIERS[Math.min(SUIT_TIERS.length - 1, tier)];
  const m: Record<string, string> = { s: c1, S: c2 };
  if (!gear) return m;
  const [h, H] = HELMETS[gearTier(gear.lamp)];
  const [v, V] = VISORS[gearTier(gear.pick)];
  const [l, L] = BOOTS[gearTier(gear.boots)];
  return { ...m, h, H, v, V, p: PACKS[gearTier(gear.pack)], b: LIGHTS[gearTier(gear.battery)], l, L };
}

export function poseFrame(pose: PlayerPose): { frame: PlayerFrame; bob: number } {
  if (pose.climbing) return { frame: Math.floor(pose.t * 8) % 2 ? 'climbA' : 'climbB', bob: 0 };
  if (pose.airborne) return { frame: (pose.vy ?? 0) > 0 ? 'fall' : 'jump', bob: 0 };
  if (pose.walking) {
    const seq: PlayerFrame[] = ['runA', 'runB', 'runC', 'runB'];
    const i = Math.floor(pose.t * 10) % 4;
    return { frame: seq[i], bob: i % 2 === 1 ? 1 : 0 };
  }
  return { frame: 'stand', bob: Math.floor(pose.t * 2) % 2 };
}

/** Draws the Salvager; (x, y) is the bottom-centre in screen px, s is px per art unit. */
export function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, pose: PlayerPose): void {
  const sq = pose.squash;
  if (sq && (sq.sx !== 1 || sq.sy !== 1)) {
    // Scale about the feet so the boots stay planted.
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sq.sx, sq.sy);
    drawPlayer(ctx, 0, 0, s, { ...pose, squash: undefined });
    ctx.restore();
    return;
  }
  const { frame, bob } = poseFrame(pose);
  let rows = playerRows(frame, bob);
  const ox = x - (PLAYER_W / 2) * s;
  const oy = y - PLAYER_H * s;
  const flip = pose.facing < 0;
  if (pose.swing) rows = rows.map((r, i) => (i >= 9 && i <= 11 ? r.padEnd(PLAYER_W - 2) + 'gg' : r));
  const remap = gearRemap(pose.gear, pose.tier ?? 0);
  const wr = pose.wear;
  if (wr?.head) [remap.h, remap.H] = wr.head;
  if (wr?.body) [remap.s, remap.S] = wr.body;
  if (wr?.feet) [remap.l, remap.L] = wr.feet;
  if (pose.paint) [remap.s, remap.S] = pose.paint;
  if (pose.helm) [remap.h, remap.H] = pose.helm;
  drawRows(ctx, rows, ox, oy, s, flip, PLAYER_W, pose.hurt ? '#ffffff' : undefined, remap);
  // Held tool at the front hand (art col ~11, row ~10), drawn at 3/4 scale.
  if (pose.held && !pose.hurt && !pose.climbing) {
    const hs = s * 0.75;
    const hx = flip ? ox + (PLAYER_W - 12) * s - 12 * hs + 3 * s : ox + 11 * s - 2 * s;
    const hy = oy + (8 + (bobOf(pose) ? 1 : 0)) * s;
    drawIcon(ctx, pose.held, hx, hy, hs, flip);
  }
}

function bobOf(pose: PlayerPose): number {
  return poseFrame(pose).bob;
}

/** Per-kind look: base sprite, palette swap and size relative to the base sprite. */
export interface EnemyLook {
  sprite: EnemySpriteKind;
  remap?: Record<string, string>;
  size: number;
  /** Debris colour when it shatters. */
  burst: string;
}

export const ENEMY_LOOKS: Record<EnemyKind, EnemyLook> = {
  crawler: { sprite: 'crawler', size: 1, burst: '#ff7a5a' },
  flyer: { sprite: 'flyer', size: 1, burst: '#36e0e8' },
  vine: { sprite: 'crawler', remap: { c: '#4f9a3f', C: '#2a5e2b', d: '#9fe07a', e: '#ff7ab8', E: '#ffd0e8' }, size: 1.05, burst: '#7fcf5a' },
  mite: { sprite: 'crawler', remap: { c: '#8a5fd6', C: '#4f3a8a', d: '#e2c4ff', e: '#8ff4ff', E: '#ffffff' }, size: 0.72, burst: '#c08cff' },
  ember: { sprite: 'flyer', remap: { m: '#5a2a1a', M: '#ff8a3c', e: '#ffd24a', w: '#ffb08a' }, size: 1.05, burst: '#ff8a3c' },
  hulk: { sprite: 'crawler', remap: { c: '#9fcbe8', C: '#4e6a88', d: '#f4fbff', e: '#36e0e8', E: '#c8ffff' }, size: 1.45, burst: '#cfe8ff' },
};

/**
 * Raiders wear red war-armour over their usual body: crawler shells and flyer wings go crimson with
 * steel highlights and a hot gold eye, so the night's wave reads at a glance. Pure.
 */
export function raiderRemap(kind: EnemyKind): Record<string, string> {
  const flyer = ENEMY_LOOKS[kind].sprite === 'flyer';
  return flyer ? { m: '#5a1418', M: '#e0463a', w: '#c9d0e4', e: '#ffcf4a', b: '#ffcf4a' } : { c: '#a8322a', C: '#4a1418', d: '#d9dde8', e: '#ffcf4a', E: '#fff2b0' };
}

export function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  kind: EnemyKind,
  x: number,
  y: number,
  s: number,
  dir: number,
  t: number,
  flash: boolean,
  raider = false,
): void {
  const base = ENEMY_LOOKS[kind];
  const look = raider ? { ...base, remap: { ...(base.remap ?? {}), ...raiderRemap(kind) } } : base;
  const rows = enemyFrame(look.sprite, t);
  const sz = s * look.size;
  // Flyer eye blinks off briefly every 1.5 s; crawler eye pulses brighter.
  const blink =
    look.sprite === 'flyer'
      ? Math.floor(t * 4) % 6 === 0
        ? { e: PAL.b }
        : undefined
      : Math.floor(t * 3) % 4 === 0
        ? { e: look.remap?.E ?? PAL.E }
        : undefined;
  const remap = look.remap || blink ? { ...(look.remap ?? {}), ...(blink ?? {}) } : undefined;
  drawRows(ctx, rows, x - (ENEMY_W / 2) * sz, y - rows.length * sz, sz, dir < 0, ENEMY_W, flash ? '#ffffff' : undefined, remap);
}

/** Gallery: every tile, the player frames and enemies at 4x. Used by `?gallery=1` and the e2e screenshot. */
export function drawGallery(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const atlas = buildAtlas();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#2a2f40';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const z = 4;
  let x = 8;
  for (let id = 1; id < TILES.length; id++) {
    if (!LOOK[id]) continue;
    ctx.drawImage(atlas, atlasCol(0, MASKS - 1) * TS, id * TS, TS, TS, x, 8, TS * 3, TS * 3);
    x += TS * 3 + 6;
    if (x > canvas.width - TS * 3) break;
  }
  // Back walls (cave rust, cave rock, built plate) after the tiles.
  const walls = buildWallAtlas();
  for (let wl = 1; wl < WALL_KINDS; wl++, x += TS * 3 + 6) ctx.drawImage(walls, 0, wl * TS, TS, TS, x + 20, 8, TS * 3, TS * 3);
  x = 8;
  for (const f of PLAYER_FRAMES) {
    drawRows(ctx, playerRows(f), x, 100, z, false, PLAYER_W);
    x += PLAYER_W * z + 10;
  }
  // Autotiled terrain sample: rust crust with lichen over metal, a cave, ores and a scaffold.
  const MAP = [
    '..........##.......',
    '....RRRRRRRRRR.....',
    '..RRRRRRRRRRRRRR...',
    '.RRRMMMM...MMMMRR..',
    '.RMMMIMM....MMCMMR.',
    '.MMMMMMM...SMMMMMM.',
    '..BBBBBBBBBBBBBBB..',
  ];
  const code: Record<string, number> = { R: T.RUST, M: T.METAL, I: T.IRON, C: T.COPPER, B: T.BEDROCK, S: T.SCAFFOLD, '#': T.PAD };
  const mapGet = (mx: number, my: number): number => code[MAP[my]?.[mx] ?? '.'] ?? T.AIR;
  const mz = 3;
  const moss = buildMoss();
  for (let my = 0; my < MAP.length; my++) {
    for (let mx = 0; mx < MAP[my].length; mx++) {
      const t = mapGet(mx, my);
      const gx0 = 8 + mx * TS * mz;
      const gy0 = 280 + my * TS * mz;
      const inside = my > 0 && MAP.slice(0, my).some((r) => r[mx] === 'R' || r[mx] === 'M');
      if (inside) ctx.drawImage(walls, 0, (my < 3 ? 1 : 2) * TS, TS, TS, gx0, gy0, TS * mz, TS * mz);
      if (t === T.AIR) continue;
      const mask = edgeMask(mapGet, mx, my);
      const v = (mx * 7 + my * 3) % VARIANTS;
      const gx = 8 + mx * TS * mz;
      const gy = 280 + my * TS * mz;
      ctx.drawImage(atlas, atlasCol(v, mask) * TS, t * TS, TS, TS, gx, gy, TS * mz, TS * mz);
      const above = mapGet(mx, my - 1);
      if (mask & EDGE_N && growsMoss(t) && above === T.AIR && (my === 0 || !MAP.slice(0, my).some((r) => r[mx] && r[mx] !== '.'))) {
        ctx.drawImage(moss, v * TS, 0, TS, MOSS_H, gx, gy, TS * mz, MOSS_H * mz);
      }
    }
  }
  // Enemies: every frame in a row underneath the player frames.
  let ex = 8 + (ENEMY_W / 2) * z;
  for (let i = 0; i < CRAWLER_ROWS.length; i++, ex += ENEMY_W * z + 10) drawEnemySprite(ctx, 'crawler', ex, 210 + 10 * z, z, 1, (i + 0.01) / 10 + 0.4, false);
  ex += 20;
  for (let i = 0; i < FLYER_ROWS.length; i++, ex += ENEMY_W * z + 10) drawEnemySprite(ctx, 'flyer', ex, 210 + 10 * z, z, 1, (i + 0.01) / 24 + 0.5, false);
  ex += 30;
  for (const k of ['vine', 'mite', 'ember', 'hulk'] as EnemyKind[]) {
    drawEnemySprite(ctx, k, ex, 210 + 10 * z, z, 1, 0.4, false);
    ex += ENEMY_W * z * ENEMY_LOOKS[k].size + 12;
  }
  // Field drones for every job (eye band in the job colour), to the right of the player frames.
  const DRONE_COLS: Record<string, string> = { miner: '#ffb03a', guard: '#ff5a6a', hauler: '#7dff9a', repair: '#5affd8', home: '#8a90a2' };
  let dxg = 620;
  for (const act of Object.keys(DRONE_COLS)) {
    drawRows(ctx, droneRows(act, 0.01), dxg, 110, z, false, DRONE_W, undefined, { e: DRONE_COLS[act] });
    dxg += DRONE_W * z + 14;
  }
  // Bosses at 2x in the free space bottom right: four walkers, then the wyrm and the core.
  const pose = { facing: 1, age: 0.3, flash: false, lift: 0, reach: 0, enraged: false, lookX: -1, lookY: 0.4 };
  let bx = 600;
  for (const id of ['colossus', 'vine_queen', 'golem', 'titan'] as BossId[]) {
    drawBossArt(ctx, id, bx, 820, 2, pose);
    bx += 130;
  }
  drawBossArt(ctx, 'wyrm', 900, 990, 2, { ...pose, facing: 1 });
  drawBossArt(ctx, 'hollow_ai', 640, 1010, 2, pose);
}
