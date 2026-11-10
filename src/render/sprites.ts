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

export interface PlayerPose {
  facing: number;
  walking: boolean;
  t: number;
  airborne: boolean;
}

/** Draws the Salvager in 1px art units; (x, y) is the bottom-centre in screen px, s is px per art unit. */
export function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, pose: PlayerPose): void {
  const f = pose.facing;
  const px = (ox: number, oy: number, w: number, h: number, color: string) => {
    const rx = f > 0 ? ox : -ox - w;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x + rx * s), Math.round(y + oy * s), Math.ceil(w * s), Math.ceil(h * s));
  };
  const step = pose.walking && !pose.airborne ? Math.floor(pose.t * 10) % 2 : 0;
  const bob = pose.walking && !pose.airborne ? (Math.floor(pose.t * 10) % 2 === 0 ? 0 : -1) : 0;
  // Legs.
  px(-4, -6, 3, 6 - (step ? 1 : 0), '#2b2f3a');
  px(1, -6, 3, 6 - (step ? 0 : 1), '#2b2f3a');
  // Torso and backpack battery.
  px(-5, -17 + bob, 10, 11, '#e8a33d');
  px(-5, -9 + bob, 10, 2, '#c47f1f');
  px(-8, -16 + bob, 3, 8, '#36e0e8');
  px(-8, -16 + bob, 3, 1, '#9ff6fa');
  // Arm.
  px(2, -15 + bob, 5, 3, '#c47f1f');
  // Head and visor.
  px(-4, -26 + bob, 8, 9, '#d9dde8');
  px(0, -24 + bob, 5, 4, '#36e0e8');
  px(0, -24 + bob, 5, 1, '#c6fbff');
}
