/**
 * Telegraphs and motion juice for the ranged / dashing boss attacks (render only):
 * - charge wind-up: a red lane with chevrons scrolling toward where the dash will end, and an end post;
 * - charge dash: speed streaks behind the boss (dust / embers come from Fx.bossCharge);
 * - volley wind-up: an orb of the boss's accent colour swelling at the muzzle with motes drawn in,
 *   fading as the bolts leave.
 * The helpers are pure so the timing and geometry are unit-tested.
 */
import { ATTACK_TIME, BOSSES, type AttackKind, type Boss } from '../sim/bosses';

/** How far the dash speed carries the boss over a charge (tiles). */
export function chargeDistance(b: Boss): number {
  return BOSSES[b.id].speed * 4.5 * ATTACK_TIME.charge.act;
}

/** The stretch of the arena a charge will sweep, from the boss to where it stops (tiles, x0 <= x1). Pure. */
export function chargeLane(b: Boss): { x0: number; x1: number; end: number } {
  const f = b.facing >= 0 ? 1 : -1;
  const end = Math.max(b.ax0, Math.min(b.ax1, b.x + f * chargeDistance(b)));
  return { x0: Math.min(b.x, end), x1: Math.max(b.x, end), end };
}

/** Progress through the telegraph of `kind`: 0 at its start (or when not winding up that attack) to 1 as it fires. Pure. */
export function warnK(b: Boss, kind: AttackKind): number {
  if (b.attack !== kind || b.at >= 0) return 0;
  return Math.max(0, Math.min(1, 1 + b.at / ATTACK_TIME[kind].warn));
}

/** Muzzle glow strength for a volley: swells (eased) over the wind-up, then fades while the bolts fire. Pure. */
export function volleyGlow(b: Boss): number {
  if (b.attack !== 'volley') return 0;
  if (b.at < 0) {
    const k = warnK(b, 'volley');
    return 0.25 + 0.75 * k * k;
  }
  return Math.max(0, 1 - b.at / ATTACK_TIME.volley.act) * 0.8;
}

/** Is the boss mid-dash? */
export function charging(b: Boss): boolean {
  return b.attack === 'charge' && b.at >= 0 && b.at < ATTACK_TIME.charge.act;
}

/** Six speed streaks behind a dash: height (0..1 of the body, from the feet up) and length (tiles). Pure. */
export function speedStreaks(age: number): { up: number; len: number }[] {
  const out: { up: number; len: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const w = Math.sin(age * 23 + i * 2.1) * 0.5 + 0.5;
    out.push({ up: 0.12 + (i / 5) * 0.76, len: 1.4 + w * 2.6 + (i % 2) * 0.6 });
  }
  return out;
}

export interface TeleView {
  /** World tile x / y to screen px. */
  sx: (x: number) => number;
  sy: (y: number) => number;
  /** Screen px per tile and per art px. */
  ts: number;
  u: number;
}

/** Draw the charge lane and dash streaks for the boss's current attack (call before the boss art). */
export function drawBossTelegraph(ctx: CanvasRenderingContext2D, b: Boss, v: TeleView, time: number): void {
  const d = BOSSES[b.id];
  const f = b.facing >= 0 ? 1 : -1;
  const midY = b.y - d.h * 0.5;
  const ck = warnK(b, 'charge');
  if (b.attack === 'charge' && b.at < 0) {
    const lane = chargeLane(b);
    const x0 = v.sx(lane.x0);
    const x1 = v.sx(lane.x1);
    const top = v.sy(b.y - d.h * 0.85);
    const bot = v.sy(b.y);
    ctx.fillStyle = `rgba(255,70,50,${(0.08 + 0.14 * ck).toFixed(3)})`;
    ctx.fillRect(x0, top, x1 - x0, bot - top);
    // Chevrons scroll toward the end of the dash; brighter as the dash nears.
    ctx.strokeStyle = `rgba(255,${Math.round(120 - 60 * ck)},70,${(0.45 + 0.5 * ck).toFixed(3)})`;
    ctx.lineWidth = Math.max(2, v.u * 2);
    const cy = v.sy(midY);
    const hh = v.ts * 0.45;
    const step = 1.3;
    const off = (time * 4) % step;
    for (let s = 0.8 + off; s < lane.x1 - lane.x0; s += step) {
      const px = v.sx(b.x + f * s);
      ctx.beginPath();
      ctx.moveTo(px - f * hh * 0.8, cy - hh);
      ctx.lineTo(px, cy);
      ctx.lineTo(px - f * hh * 0.8, cy + hh);
      ctx.stroke();
    }
    // End post: where the dash stops.
    const ex = v.sx(lane.end);
    ctx.fillStyle = `rgba(255,90,70,${(0.55 + 0.4 * ck).toFixed(3)})`;
    for (let y = top; y < bot; y += v.ts * 0.5) ctx.fillRect(ex - v.u, y, v.u * 2, v.ts * 0.3);
  }
  if (charging(b)) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    const back = -f;
    const edge = v.sx(b.x + back * d.halfW * 0.9);
    for (const s of speedStreaks(time)) {
      const y = v.sy(b.y - d.h * s.up);
      const len = s.len * v.ts;
      ctx.fillStyle = d.accent;
      ctx.fillRect(back > 0 ? edge : edge - len, y - v.u, len, v.u * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(back > 0 ? edge : edge - len * 0.45, y - v.u * 0.5, len * 0.45, Math.max(1, v.u));
    }
    ctx.restore();
  }
}

/** Draw the volley muzzle orb on top of the boss art (call after it). */
export function drawBossMuzzle(ctx: CanvasRenderingContext2D, b: Boss, v: TeleView, time: number): void {
  const d = BOSSES[b.id];
  const g = volleyGlow(b);
  if (g > 0) {
    const mx = v.sx(b.x);
    const my = v.sy(b.y - d.h * 0.6);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35 + 0.4 * g;
    ctx.fillStyle = d.accent;
    ctx.beginPath();
    ctx.arc(mx, my, (4 + 9 * g) * v.u, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6 + 0.4 * g;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mx, my, (1.5 + 3 * g) * v.u, 0, Math.PI * 2);
    ctx.fill();
    if (b.at < 0) {
      // Motes drawn in from all sides as it charges.
      const k = warnK(b, 'volley');
      ctx.fillStyle = d.accent;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + time * 3;
        const r = (1 - k) * 1.8 * v.ts + 6 * v.u;
        ctx.fillRect(Math.round(mx + Math.cos(a) * r - v.u), Math.round(my + Math.sin(a) * r - v.u), Math.ceil(v.u * 2), Math.ceil(v.u * 2));
      }
    }
    ctx.restore();
  }
}
