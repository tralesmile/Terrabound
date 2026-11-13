/**
 * Hollow AI arena (render only): a circuit trace glows along the floor of the arena, with pulse
 * rings rolling outward from under the boss. Accent pink in phase 1, angry red and faster in phase 2.
 * The helpers are pure so the geometry and timing are unit-tested.
 */
import { BOSSES, phase, type Boss } from '../sim/bosses';

export interface FloorCell {
  /** Tile column. */
  x: number;
  /** Top of the floor tile (tile row: air above, solid here). */
  y: number;
}

/**
 * Floor of the arena: per column in [ax0, ax1], the first solid tile with air above it, scanning
 * down from `fromY` for at most `depth` rows. Columns with no floor in reach are left out. Pure.
 */
export function arenaFloor(isSolid: (x: number, y: number) => boolean, ax0: number, ax1: number, fromY: number, depth = 14): FloorCell[] {
  const out: FloorCell[] = [];
  const y0 = Math.floor(fromY);
  for (let x = Math.floor(ax0); x <= Math.ceil(ax1); x++) {
    for (let y = y0; y < y0 + depth; y++) {
      if (isSolid(x, y) && !isSolid(x, y - 1)) {
        out.push({ x, y });
        break;
      }
    }
  }
  return out;
}

/** Seconds between pulse rings: phase 2 pulses almost twice as fast. */
export function pulsePeriod(ph: 1 | 2): number {
  return ph === 2 ? 0.7 : 1.3;
}

/** Speed the pulse ring rolls outward (tiles/s). */
export const PULSE_SPEED = 14;

/**
 * Glow 0..1 of the floor `dist` tiles from the boss at `time`: a soft crest riding outward, two
 * crests in flight at once, fading with distance. Pure.
 */
export function arenaPulse(dist: number, time: number, ph: 1 | 2): number {
  const per = pulsePeriod(ph);
  const d = Math.abs(dist);
  let best = 0;
  for (let k = 0; k < 2; k++) {
    const r = (((time / per) % 1) + k) * per * PULSE_SPEED;
    const crest = Math.max(0, 1 - Math.abs(d - r) / 1.6);
    best = Math.max(best, crest);
  }
  return best * Math.max(0, 1 - d / 30);
}

/** Trace colour: the boss accent in phase 1, red once enraged. */
export function arenaColor(b: Boss): string {
  return phase(b) === 2 ? '#ff3a4a' : BOSSES[b.id].accent;
}

export interface ArenaView {
  sx: (x: number) => number;
  sy: (y: number) => number;
  ts: number;
  u: number;
}

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
}

/** Draw the glowing floor circuit for the Hollow AI fight. */
export function drawArenaFloor(ctx: CanvasRenderingContext2D, b: Boss, floor: FloorCell[], v: ArenaView, time: number): void {
  const col = arenaColor(b);
  const ph = phase(b);
  const lw = Math.max(2, Math.round(v.u * 2));
  for (const c of floor) {
    const k = arenaPulse(c.x + 0.5 - b.x, time, ph);
    const px = v.sx(c.x);
    const py = v.sy(c.y);
    // Base trace along the top face, brighter where the pulse passes.
    ctx.fillStyle = hexA(col, 0.28 + 0.6 * k);
    ctx.fillRect(px, py - lw, v.ts, lw);
    // Glow fading up into the air above the trace.
    if (k > 0.05) {
      ctx.fillStyle = hexA(col, 0.22 * k);
      ctx.fillRect(px, py - lw - v.ts * 0.5, v.ts, v.ts * 0.5);
    }
    // A node every third tile: a small square pad with a drop line into the floor.
    if (((c.x % 3) + 3) % 3 === 0) {
      const s = Math.round(v.ts * 0.22);
      ctx.fillStyle = hexA(k > 0.4 ? '#ffffff' : col, 0.55 + 0.45 * k);
      ctx.fillRect(px + v.ts / 2 - s / 2, py - lw / 2 - s / 2, s, s);
      ctx.fillStyle = hexA(col, 0.25 + 0.4 * k);
      ctx.fillRect(px + v.ts / 2 - lw / 4, py, Math.max(1, lw / 2), v.ts * 0.55);
    }
  }
}
