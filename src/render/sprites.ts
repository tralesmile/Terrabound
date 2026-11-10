import { hash2 } from '../sim/rng';
import { T, TILES } from '../sim/tiles';

/** Tile size in logical pixels. All art is generated in code: zero asset files, zero asset cost, tiny bundle. */
export const TS = 16;
export const VARIANTS = 4;

interface Look {
  base: string;
  light: string;
  dark: string;
  speck?: string;
  speckCount?: number;
}

const LOOK: Record<number, Look> = {
  [T.RUST]: { base: '#7a4a3a', light: '#935c48', dark: '#5f382c' },
  [T.METAL]: { base: '#4a5568', light: '#5d6a80', dark: '#384154' },
  [T.IRON]: { base: '#4a5568', light: '#5d6a80', dark: '#384154', speck: '#d6c7b8', speckCount: 9 },
  [T.COPPER]: { base: '#4a5568', light: '#5d6a80', dark: '#384154', speck: '#e08a3c', speckCount: 9 },
  [T.BEDROCK]: { base: '#1a1d29', light: '#252938', dark: '#101219' },
  [T.SCAFFOLD]: { base: '#55627a', light: '#7d8da6', dark: '#3b4658', speck: '#c9a35a', speckCount: 3 },
  [T.PAD]: { base: '#2b3a4a', light: '#36e0e8', dark: '#1d2733' },
};

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
};

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Atlas: one row per tile id, VARIANTS columns. */
export function buildAtlas(): HTMLCanvasElement {
  const canvas = makeCanvas(TS * VARIANTS, TS * TILES.length);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  for (let id = 1; id < TILES.length; id++) {
    const look = LOOK[id];
    if (!look) continue;
    for (let v = 0; v < VARIANTS; v++) {
      const ox = v * TS;
      const oy = id * TS;
      ctx.fillStyle = look.base;
      ctx.fillRect(ox, oy, TS, TS);
      // Pixel noise.
      for (let y = 0; y < TS; y++) {
        for (let x = 0; x < TS; x++) {
          const h = hash2(x + v * 31, y + id * 17, 1234);
          if (h > 0.86) {
            ctx.fillStyle = look.light;
            ctx.fillRect(ox + x, oy + y, 1, 1);
          } else if (h < 0.1) {
            ctx.fillStyle = look.dark;
            ctx.fillRect(ox + x, oy + y, 1, 1);
          }
        }
      }
      // Bevel: bright top-left, dark bottom-right.
      ctx.fillStyle = look.light;
      ctx.fillRect(ox, oy, TS, 1);
      ctx.fillRect(ox, oy, 1, TS);
      ctx.fillStyle = look.dark;
      ctx.fillRect(ox, oy + TS - 1, TS, 1);
      ctx.fillRect(ox + TS - 1, oy, 1, TS);
      if (look.speck) {
        ctx.fillStyle = look.speck;
        for (let i = 0; i < (look.speckCount ?? 0); i++) {
          const x = 2 + Math.floor(hash2(i, v, id * 91) * 11);
          const y = 2 + Math.floor(hash2(v, i, id * 57) * 11);
          ctx.fillRect(ox + x, oy + y, 2, 2);
        }
      }
      if (id === T.PAD) {
        ctx.fillStyle = look.light;
        ctx.fillRect(ox + 1, oy + 1, TS - 2, 2);
        ctx.fillStyle = '#ffcf4a';
        ctx.fillRect(ox + 3 + (v % 2) * 6, oy + 6, 2, 2);
      }
    }
  }
  return canvas;
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
  jump: ['    olllLlo', '   ollo ollo', '   olo   olo', '   olLo  olLo', '   oooo  oooo', '', '', ''],
  fall: ['    olllLlo', '    olo olo', '    olo olo', '    olLo olLo', '    oooo oooo', '', '', ''],
};

export type PlayerFrame = 'stand' | 'runA' | 'runB' | 'runC' | 'jump' | 'fall';
export const PLAYER_FRAMES: PlayerFrame[] = ['stand', 'runA', 'runB', 'runC', 'jump', 'fall'];

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

export const CRAWLER_ROWS: string[][] = [
  [
    '    oooooo',
    '  ooccccccoo',
    ' occcdccccCco',
    'occcceeccccCco',
    'occccEeccccCco',
    ' oCCCCCCCCCCo',
    '  ooooooooooo',
    ' o o o  o o o',
    'o  o o  o o  o',
  ],
  [
    '    oooooo',
    '  ooccccccoo',
    ' occcdccccCco',
    'occcceeccccCco',
    'occccEeccccCco',
    ' oCCCCCCCCCCo',
    '  ooooooooooo',
    '  o o oo o o',
    ' o  o o  o o',
  ],
];

export const FLYER_ROWS: string[][] = [
  [
    'wwwwo    owwww',
    '  oooommoooo',
    '    ommMmmo',
    '    omeemmo',
    '    ommmmmo',
    '     oooooo',
    '      oo',
  ],
  [
    '     o    o',
    '  oooommoooo',
    '    ommMmmo',
    '    ombbmmo',
    '    ommmmmo',
    'wwww oooooo wwww',
    '      oo',
  ],
];

export function drawRows(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  x: number,
  y: number,
  s: number,
  flip: boolean,
  width: number,
  tint?: string,
): void {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      const color = PAL[ch];
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
}

export function poseFrame(pose: PlayerPose): { frame: PlayerFrame; bob: number } {
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
  const { frame, bob } = poseFrame(pose);
  drawRows(ctx, playerRows(frame, bob), x - (PLAYER_W / 2) * s, y - PLAYER_H * s, s, pose.facing < 0, PLAYER_W);
}

export function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  kind: 'crawler' | 'flyer',
  x: number,
  y: number,
  s: number,
  dir: number,
  t: number,
  flash: boolean,
): void {
  const frames = kind === 'crawler' ? CRAWLER_ROWS : FLYER_ROWS;
  const w = kind === 'crawler' ? 16 : 16;
  const rows = frames[Math.floor(t * (kind === 'crawler' ? 6 : 14)) % frames.length];
  drawRows(ctx, rows, x - (w / 2) * s, y - rows.length * s, s, dir < 0, w, flash ? '#ffffff' : undefined);
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
    ctx.drawImage(atlas, 0, id * TS, TS, TS, x, 8, TS * z, TS * z);
    x += TS * z + 6;
    if (x > canvas.width - TS * z) break;
  }
  x = 8;
  for (const f of PLAYER_FRAMES) {
    drawRows(ctx, playerRows(f), x, 100, z, false, PLAYER_W);
    x += PLAYER_W * z + 10;
  }
  x += 20;
  for (let i = 0; i < 2; i++) drawEnemySprite(ctx, 'crawler', x + 32 + i * 80, 100 + 24 * z, z, 1, i / 6, false);
  for (let i = 0; i < 2; i++) drawEnemySprite(ctx, 'flyer', x + 200 + i * 80, 100 + 40 * z, z, 1, i / 14, false);
}
