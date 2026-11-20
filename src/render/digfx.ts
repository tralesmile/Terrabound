/**
 * Dig feedback (render only, P12-A): the block being drilled cracks in four visible stages that grow
 * from one impact point (each stage keeps the pixels of the last, so the crack never jumps around),
 * and every drill tick knocks small chips off the face in the block's colours. Pure: chips take the
 * random source as an argument.
 */
import { hash2 } from '../sim/rng';
import { breakStyle } from './breakfx';
import type { Particle } from './fx';
import { lighten } from './fx';

/** Art pixels per tile side. */
const N = 16;
/** Crack stages drawn before the block breaks. */
export const CRACK_STAGES = 4;
/** Pixel steps each branch grows per stage. */
const STEP_PER_STAGE = 4;

/** Stage 0..CRACK_STAGES for a mining progress 0..1 (0 = no crack yet). */
export function crackStage(progress: number): number {
  if (!(progress > 0)) return 0;
  return Math.min(CRACK_STAGES, 1 + Math.floor(progress * CRACK_STAGES));
}

/**
 * Crack pixels (art px, 0..15) for a tile at a stage: three branches walk out from a hashed impact
 * point near the centre. Deterministic per tile; stage k contains every pixel of stage k - 1.
 */
export function digCrackPixels(tx: number, ty: number, stage: number): Array<[number, number]> {
  const s = Math.max(0, Math.min(CRACK_STAGES, Math.floor(stage)));
  if (s === 0) return [];
  const cx = 5 + Math.floor(hash2(tx, ty, 11) * 6);
  const cy = 5 + Math.floor(hash2(ty, tx, 13) * 6);
  const out: Array<[number, number]> = [[cx, cy]];
  const seen = new Set<number>([cy * N + cx]);
  for (let br = 0; br < 3; br++) {
    // Branch headings spread around the circle so the crack reaches out in three directions.
    const base = (br / 3) * Math.PI * 2 + hash2(tx + br, ty, 17) * 1.2;
    let x = cx;
    let y = cy;
    for (let i = 0; i < s * STEP_PER_STAGE; i++) {
      const wob = (hash2(tx * 7 + br, ty * 3 + i, 23) - 0.5) * 1.4;
      const nx = Math.max(0, Math.min(N - 1, Math.round(x + Math.cos(base + wob))));
      const ny = Math.max(0, Math.min(N - 1, Math.round(y + Math.sin(base + wob))));
      x = nx;
      y = ny;
      const k = ny * N + nx;
      if (!seen.has(k)) {
        seen.add(k);
        out.push([nx, ny]);
      }
    }
  }
  return out;
}

/**
 * Chips knocked off the face of the drilled tile (tile top-left x, y) toward the player at (px, py):
 * 1-3 tiny bits in the block's colour, metal also throws a spark. Pure given `rnd`.
 */
export function digChips(x: number, y: number, tile: number, color: string, px: number, py: number, rnd: () => number): Particle[] {
  const st = breakStyle(tile);
  const cx = x + 0.5;
  const cy = y + 0.5;
  const dx = px - cx;
  const dy = py - 1 - cy;
  const d = Math.hypot(dx, dy) || 1;
  // Chips leave from the face nearest the player.
  const fx = cx + (dx / d) * 0.5;
  const fy = cy + (dy / d) * 0.5;
  const n = 1 + Math.floor(rnd() * 3);
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(dy, dx) + (rnd() - 0.5) * 1.6;
    const v = 2 + rnd() * 3;
    const life = 0.25 + rnd() * 0.2;
    out.push({ x: fx, y: fy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life, max: life, color: rnd() < 0.3 ? lighten(color, 0.35) : color, size: 1, g: st === 'leaf' ? 6 : 22 });
  }
  if (st === 'metal' || st === 'tech') {
    const a = Math.atan2(dy, dx) + (rnd() - 0.5);
    out.push({ x: fx, y: fy, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7 - 2, life: 0.18, max: 0.18, color: '#fff6c8', size: 1, g: 10 });
  }
  return out;
}
