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
  const { frame, bob } = poseFrame(pose);
  let rows = playerRows(frame, bob);
  const [c1, c2] = SUIT_TIERS[Math.min(SUIT_TIERS.length - 1, pose.tier ?? 0)];
  const ox = x - (PLAYER_W / 2) * s;
  const oy = y - PLAYER_H * s;
  const flip = pose.facing < 0;
  if (pose.swing) rows = rows.map((r, i) => (i >= 9 && i <= 11 ? r.padEnd(PLAYER_W - 2) + 'gg' : r));
  drawRows(ctx, rows, ox, oy, s, flip, PLAYER_W, pose.hurt ? '#ffffff' : undefined, { s: c1, S: c2 });
}

export function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  kind: EnemySpriteKind,
  x: number,
  y: number,
  s: number,
  dir: number,
  t: number,
  flash: boolean,
): void {
  const rows = enemyFrame(kind, t);
  // Flyer eye blinks off briefly every 1.5 s; crawler eye pulses brighter.
  const remap =
    kind === 'flyer'
      ? Math.floor(t * 4) % 6 === 0
        ? { e: PAL.b }
        : undefined
      : Math.floor(t * 3) % 4 === 0
        ? { e: PAL.E }
        : undefined;
  drawRows(ctx, rows, x - (ENEMY_W / 2) * s, y - rows.length * s, s, dir < 0, ENEMY_W, flash ? '#ffffff' : undefined, remap);
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
  // Enemies: every frame in a row underneath the player frames.
  let ex = 8 + (ENEMY_W / 2) * z;
  for (let i = 0; i < CRAWLER_ROWS.length; i++, ex += ENEMY_W * z + 10) drawEnemySprite(ctx, 'crawler', ex, 210 + 10 * z, z, 1, (i + 0.01) / 10 + 0.4, false);
  ex += 20;
  for (let i = 0; i < FLYER_ROWS.length; i++, ex += ENEMY_W * z + 10) drawEnemySprite(ctx, 'flyer', ex, 210 + 10 * z, z, 1, (i + 0.01) / 24 + 0.5, false);
}
