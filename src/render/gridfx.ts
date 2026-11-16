/**
 * Logic Warden laser grid (render only). During the telegraph thin dashed guide lines flicker
 * where the beams will stand, brightening as the cast nears, with a diamond emitter at the top of
 * each. When the grid fires, each line becomes a white-hot beam in a wide glow of the accent colour.
 * Beams stop on the first floor below the boss, with a scorch glow where they land. The helpers are pure.
 */
import { ATTACK_TIME, BOSSES, type Boss } from '../sim/bosses';
import { GRID_BAR_H, GRID_HALF, gridBarActive, gridColumns, gridFiring, gridFloorY } from '../sim/lasergrid';
import type { TeleView } from './bosstele';

export interface GridLook {
  /** 0 = nothing to draw. */
  alpha: number;
  /** Beam width in tiles (thin guide during the telegraph). */
  width: number;
  live: boolean;
}

/** How the grid looks this frame: guide lines fade in over the telegraph, beams flare then fade. Pure. */
export function gridLook(b: Boss): GridLook {
  if (b.attack !== 'grid') return { alpha: 0, width: 0, live: false };
  const { warn, act } = ATTACK_TIME.grid;
  if (b.at < 0) {
    const k = Math.max(0, Math.min(1, 1 + b.at / warn));
    return { alpha: 0.2 + 0.6 * k, width: 0.08 + 0.1 * k, live: false };
  }
  if (!gridFiring(b)) return { alpha: 0, width: 0, live: false };
  const k = b.at / act;
  // Flare to full width at once, hold, then narrow out over the last third.
  const fade = k < 0.66 ? 1 : Math.max(0, 1 - (k - 0.66) / 0.34);
  return { alpha: fade, width: GRID_HALF * 2 * (0.6 + 0.4 * fade), live: true };
}

/** First solid row at or below fromY in column x (within maxDepth rows), else fromY + maxDepth. Pure. */
export function beamFloor(isSolid: (x: number, y: number) => boolean, x: number, fromY: number, maxDepth = 14): number {
  const tx = Math.floor(x);
  const y0 = Math.max(0, Math.floor(fromY));
  for (let y = y0; y < y0 + maxDepth; y++) if (isSolid(tx, y)) return y;
  return y0 + maxDepth;
}

/** Draws the grid; returns how many beams (or guides) were drawn (e2e probe). */
export function drawGridBeams(ctx: CanvasRenderingContext2D, b: Boss, tv: TeleView, time: number, isSolid: (x: number, y: number) => boolean): number {
  const look = gridLook(b);
  if (look.alpha <= 0) return 0;
  const d = BOSSES[b.id];
  const cols = gridColumns(b);
  const top = tv.sy(b.y - d.h - 9);
  ctx.save();
  for (const c of cols) {
    const x = tv.sx(c);
    const bot = tv.sy(beamFloor(isSolid, c, b.y - 1));
    const H = bot - top;
    if (!look.live) {
      // Dashed guide line that crawls downward, plus a diamond emitter at the top.
      const flick = 0.75 + 0.25 * Math.sin(time * 40 + c * 3);
      ctx.globalAlpha = look.alpha * flick;
      ctx.fillStyle = d.accent;
      const w = Math.max(tv.u, look.width * tv.ts);
      const dash = tv.u * 6;
      const shift = (time * 60 * tv.u) % (dash * 2);
      for (let y = top - dash * 2 + shift; y < bot; y += dash * 2) ctx.fillRect(Math.round(x - w / 2), Math.round(y), Math.ceil(w), Math.ceil(dash));
      ctx.globalAlpha = Math.min(1, look.alpha + 0.2);
      const r = tv.u * 4;
      ctx.beginPath();
      ctx.moveTo(x, top - r);
      ctx.lineTo(x + r, top);
      ctx.lineTo(x, top + r);
      ctx.lineTo(x - r, top);
      ctx.closePath();
      ctx.fill();
    } else {
      const w = look.width * tv.ts;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 * look.alpha;
      ctx.fillStyle = d.accent;
      ctx.fillRect(Math.round(x - w * 1.4), top, Math.ceil(w * 2.8), H);
      ctx.globalAlpha = 0.85 * look.alpha;
      ctx.fillRect(Math.round(x - w / 2), top, Math.ceil(w), H);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = look.alpha;
      ctx.fillStyle = '#ffffff';
      const core = Math.max(tv.u * 2, w * 0.3);
      ctx.fillRect(Math.round(x - core / 2), top, Math.ceil(core), H);
      // Scorch flare where the beam meets the floor.
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.6 * look.alpha;
      ctx.fillStyle = d.accent;
      ctx.beginPath();
      ctx.ellipse(x, bot, w * 1.6, tv.u * 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  if (gridBarActive(b)) {
    // Phase 2 tripwire: a flat beam skimming the floor across the whole arena; hop it.
    const fy = gridFloorY(isSolid, b);
    const y1 = tv.sy(fy);
    const hh = GRID_BAR_H * tv.ts;
    const xa = tv.sx(b.ax0);
    const xb = tv.sx(b.ax1);
    ctx.fillStyle = d.accent;
    if (!look.live) {
      ctx.globalAlpha = look.alpha * (0.75 + 0.25 * Math.sin(time * 40));
      const dash = tv.u * 6;
      const shift = (time * 60 * tv.u) % (dash * 2);
      const th = Math.max(tv.u, look.width * tv.ts);
      for (let x = xa - dash * 2 + shift; x < xb; x += dash * 2) ctx.fillRect(Math.round(x), Math.round(y1 - hh / 2 - th / 2), Math.ceil(dash), Math.ceil(th));
    } else {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 * look.alpha;
      ctx.fillRect(xa, Math.round(y1 - hh * 1.2), xb - xa, Math.ceil(hh * 1.4));
      ctx.globalAlpha = 0.85 * look.alpha;
      ctx.fillRect(xa, Math.round(y1 - hh), xb - xa, Math.ceil(hh));
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = look.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(xa, Math.round(y1 - hh / 2 - tv.u), xb - xa, Math.ceil(tv.u * 2));
    }
  }
  ctx.restore();
  return cols.length;
}
