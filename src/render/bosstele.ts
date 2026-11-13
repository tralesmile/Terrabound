/**
 * Telegraphs and motion juice for the ranged / dashing boss attacks (render only):
 * - charge wind-up: a red lane with chevrons scrolling toward where the dash will end, and an end post;
 * - charge dash: speed streaks behind the boss (dust / embers come from Fx.bossCharge);
 * - volley wind-up: an orb of the boss's accent colour swelling at the muzzle with motes drawn in,
 *   fading as the bolts leave.
 * The helpers are pure so the timing and geometry are unit-tested.
 */
import { ATTACK_TIME, BOLT_LIFE, BOSSES, phase, type AttackKind, type Boss } from '../sim/bosses';

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

/** Where a summon's minions will appear (tiles, matching game.ts: 2 apart around the boss, 3 when enraged). Pure. */
export function summonSpots(b: Boss): number[] {
  const n = phase(b) === 2 ? 3 : 2;
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(b.x + (i - 1) * 2);
  return out;
}

/**
 * Summon wind-up: at each spot a minion will crawl out of, a glowing crack opens on the ground and
 * sprouts (vines, crystals, sparks: the boss's accent colour) grow up out of it as the summon nears.
 */
export function drawSummonTelegraph(ctx: CanvasRenderingContext2D, b: Boss, v: TeleView, time: number): void {
  const k = warnK(b, 'summon');
  if (k <= 0) return;
  const d = BOSSES[b.id];
  const gy = v.sy(BOSSES[b.id].flying ? b.y + 1 : b.y);
  for (const [j, x] of summonSpots(b).entries()) {
    const cx = v.sx(x);
    const w = v.ts * (0.5 + 0.5 * k);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25 + 0.5 * k;
    ctx.fillStyle = d.accent;
    ctx.beginPath();
    ctx.ellipse(cx, gy, w, w * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#1a0f14';
    ctx.fillRect(Math.round(cx - w * 0.6), Math.round(gy - v.u), Math.ceil(w * 1.2), Math.ceil(v.u * 2));
    // Sprouts: five shoots of different heights swaying, growing with k.
    for (let i = 0; i < 5; i++) {
      const sx = cx + (i - 2) * w * 0.28;
      const hgt = v.ts * k * (0.5 + ((i * 37 + j * 11) % 5) * 0.15);
      const sway = Math.sin(time * 6 + i + j) * v.u * 1.5 * k;
      ctx.fillStyle = d.accent;
      ctx.fillRect(Math.round(sx + sway), Math.round(gy - hgt), Math.ceil(v.u * 2), Math.ceil(hgt));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(sx + sway), Math.round(gy - hgt), Math.ceil(v.u * 2), Math.ceil(v.u * 2));
    }
  }
}

export { BOLT_LIFE };
/** Trail dots behind a boss bolt and their spacing (tiles). */
export const TRAIL_N = 7;
export const TRAIL_STEP = 0.18;

/**
 * A fading trail behind a boss bolt: dots back along its path (opposite its velocity), shrinking and
 * fading toward the tail. The trail grows in over the first ~0.1 s so it never reaches behind the muzzle. Pure.
 */
export function boltTrail(bb: { x: number; y: number; vx: number; vy: number; life: number }): { x: number; y: number; r: number; a: number }[] {
  const sp = Math.hypot(bb.vx, bb.vy);
  if (sp < 1e-6) return [];
  const age = Math.max(0, BOLT_LIFE - bb.life);
  const reach = Math.min(TRAIL_N * TRAIL_STEP, age * Math.max(sp, 11));
  const ux = -bb.vx / sp;
  const uy = -bb.vy / sp;
  const out: { x: number; y: number; r: number; a: number }[] = [];
  for (let i = 1; i <= TRAIL_N; i++) {
    const s = i * TRAIL_STEP;
    if (s > reach) break;
    const k = 1 - i / (TRAIL_N + 1);
    out.push({ x: bb.x + ux * s, y: bb.y + uy * s, r: 0.8 + 1.9 * k, a: 0.15 + 0.6 * k });
  }
  return out;
}
