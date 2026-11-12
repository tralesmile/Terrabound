/** Cosmetic effects only. Nothing here may affect game state, so the simulation stays deterministic and testable. */
import { ENEMY_HIT_IFRAMES } from '../sim/enemies';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  /** Gravity in tiles/s^2 (default 18; negative floats up, e.g. smoke). */
  g?: number;
}

export interface Ring {
  x: number;
  y: number;
  life: number;
  max: number;
  /** Final radius in tiles. */
  r: number;
  color: string;
}

/** A sprite chunk for `shatter`: offset from bottom-centre in art px. */
export interface ShatterPiece {
  dx: number;
  dy: number;
  color: string;
}

export interface FloatText {
  x: number;
  y: number;
  life: number;
  max: number;
  text: string;
  color: string;
}

const MAX_PARTICLES = 400;
/** Seconds a landing squash lasts. */
export const SQUASH_TIME = 0.22;
/** Seconds between footstep puffs while running. */
export const STEP_EVERY = 0.28;

/**
 * Landing squash as (scaleX, scaleY) for the player sprite: wide and short right after
 * impact, easing back to (1, 1). `left` is the time remaining, `power` 0..1.
 */
export function squashScale(left: number, power: number): { sx: number; sy: number } {
  if (left <= 0 || power <= 0) return { sx: 1, sy: 1 };
  const k = Math.min(1, left / SQUASH_TIME) ** 2 * Math.min(1, power) * 0.22;
  return { sx: 1 + k, sy: 1 - k };
}

/** Enemy hit i-frames (game.ts sets 0.15 s on every hit); the squash eases over this window. */
export const HIT_SQUASH_TIME = ENEMY_HIT_IFRAMES;

/**
 * Hit squash for an enemy sprite (Dead Cells style): on the hit frame it is squashed flat and
 * wide, then it springs back tall for a beat and settles to (1, 1). `left` is the i-frame time left.
 */
export function hitSquash(left: number): { sx: number; sy: number } {
  if (left <= 0) return { sx: 1, sy: 1 };
  const p = 1 - Math.min(1, left / HIT_SQUASH_TIME); // 0 at the hit, 1 when settled
  // Damped spring: -cos gives squash first, then a smaller stretch.
  const k = Math.cos(p * Math.PI * 1.5) * (1 - p) * 0.3;
  return { sx: 1 + k, sy: 1 - k };
}

/** Seconds the red hurt vignette and recoil last after the player takes damage. */
export const HURT_TIME = 0.45;
/** HP fraction under which the screen edge beats red like a heartbeat. */
export const LOW_HP = 0.3;

/** Hurt strength 0.35..1 from damage as a share of max HP (a 1 HP gas tick still reads). */
export function hurtPower(amount: number, maxHp: number): number {
  return Math.max(0.35, Math.min(1, (amount / Math.max(1, maxHp)) * 4));
}

/**
 * Alpha of the red screen-edge vignette: a sharp flash right after a hit that fades over
 * HURT_TIME, plus a slow heartbeat while HP is under LOW_HP. Never above 0.6.
 */
export function hurtVignette(left: number, power: number, hpFrac: number, time: number): number {
  const flash = left > 0 ? (Math.min(1, left / HURT_TIME) ** 1.5) * 0.55 * power : 0;
  let beat = 0;
  if (hpFrac > 0 && hpFrac < LOW_HP) {
    const depth = 1 - hpFrac / LOW_HP; // 0 at the threshold, 1 near death
    const pulse = Math.max(0, Math.sin(time * Math.PI * 2 * 1.2)) ** 4;
    beat = (0.08 + 0.2 * pulse) * (0.4 + 0.6 * depth);
  }
  return Math.min(0.6, Math.max(flash, beat));
}

/** Player recoil on a hit: squeezed thin and tall for a beat (opposite of the landing squash). */
export function hurtSquash(left: number): { sx: number; sy: number } {
  if (left <= 0) return { sx: 1, sy: 1 };
  const p = 1 - Math.min(1, left / HURT_TIME);
  const k = Math.cos(p * Math.PI * 2) * (1 - p) ** 2 * 0.16;
  return { sx: 1 - k, sy: 1 + k };
}

/** Squash strength from a landing speed in tiles/s (soft hops barely squash). */
export function landPower(speed: number): number {
  return Math.max(0, Math.min(1, (speed - 4) / 14));
}
const MAX_TEXTS = 24;
const MAX_RINGS = 16;

/** A short glowing line from a muzzle to a hit (turret shots). */
export interface Tracer {
  x: number;
  y: number;
  tx: number;
  ty: number;
  color: string;
  life: number;
  max: number;
}
const MAX_TRACERS = 24;

export class Fx {
  particles: Particle[] = [];
  tracers: Tracer[] = [];
  texts: FloatText[] = [];
  rings: Ring[] = [];
  shake = 0;
  /** Landing squash timer and strength (read by the renderer). */
  squashLeft = 0;
  squashPower = 0;
  /** Player hurt timer and strength (vignette, recoil). */
  hurtLeft = 0;
  hurtPower = 0;
  private stepAcc = 0;

  /** The player took damage: red edge flash, recoil squash and a damage number. */
  hurt(x: number, y: number, amount: number, maxHp: number): void {
    const carry = this.hurtLeft > 0 ? this.hurtPower * 0.5 : 0;
    this.hurtLeft = HURT_TIME;
    this.hurtPower = Math.max(carry, hurtPower(amount, maxHp));
    if (amount >= 1) this.text(x, y, `-${Math.round(amount)}`, '#ff5a5a');
  }

  /** Landing: squash the sprite and kick dust out to both sides of the feet. */
  land(x: number, y: number, speed: number, ground: string): void {
    const p = landPower(speed);
    if (p <= 0) return;
    this.squashLeft = SQUASH_TIME;
    this.squashPower = p;
    this.dust(x, y, ground, 3 + Math.round(p * 7), 1.5 + p * 4);
  }

  /** Rising pale puffs (steam, smoke) that float up and fade. */
  smoke(x: number, y: number, color: string, n: number): void {
    for (let i = 0; i < n && this.particles.length < MAX_PARTICLES; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.8,
        y,
        vx: (Math.random() - 0.5) * 1,
        vy: -1 - Math.random() * 1.5,
        life: 0.7 + Math.random() * 0.6,
        max: 1.3,
        color,
        size: 3,
        g: -1.5,
      });
    }
  }

  /** Low, sideways dust puffs at the feet in the ground's colour. */
  dust(x: number, y: number, color: string, n: number, speed: number, dir = 0): void {
    for (let i = 0; i < n && this.particles.length < MAX_PARTICLES; i++) {
      const side = dir !== 0 ? dir : i % 2 === 0 ? -1 : 1;
      this.particles.push({
        x: x + side * (0.15 + Math.random() * 0.25),
        y: y - 0.05,
        vx: side * speed * (0.4 + Math.random() * 0.6),
        vy: -0.6 - Math.random() * 1.2,
        life: 0.3 + Math.random() * 0.3,
        max: 0.6,
        color,
        size: 2 + (Math.random() < 0.3 ? 1 : 0),
        g: 3,
      });
    }
  }

  /** Footstep puffs while running on the ground: one small puff behind the feet every STEP_EVERY s. */
  footsteps(dt: number, running: boolean, x: number, y: number, facing: number, ground: string): void {
    if (!running) {
      this.stepAcc = 0;
      return;
    }
    this.stepAcc += dt;
    if (this.stepAcc >= STEP_EVERY) {
      this.stepAcc -= STEP_EVERY;
      this.dust(x - facing * 0.2, y, ground, 2, 1.2, -facing);
    }
  }

  /**
   * Death burst: every sprite chunk flies outward from the sprite centre in its own colour,
   * plus a shock ring and a few smoke puffs. (x, y) is the bottom-centre in tiles; `unit` is
   * tiles per art px.
   */
  shatter(x: number, y: number, pieces: ShatterPiece[], unit: number, accent: string, speed = 6): void {
    let cy = 0;
    for (const p of pieces) cy += p.dy;
    cy = pieces.length ? cy / pieces.length : 0;
    for (const p of pieces) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const ox = p.dx;
      const oy = p.dy - cy;
      const len = Math.hypot(ox, oy) || 1;
      const v = speed * (0.5 + Math.random() * 0.7);
      this.particles.push({
        x: x + p.dx * unit,
        y: y + p.dy * unit,
        vx: (ox / len) * v + (Math.random() - 0.5) * 1.5,
        vy: (oy / len) * v - 3 - Math.random() * 2,
        life: 0.6 + Math.random() * 0.5,
        max: 1.1,
        color: p.color,
        size: 2,
      });
    }
    this.ring(x, y + cy * unit, 1.4, accent, 0.35);
    for (let i = 0; i < 5 && this.particles.length < MAX_PARTICLES; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.6,
        y: y + cy * unit,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -0.5 - Math.random(),
        life: 0.7 + Math.random() * 0.4,
        max: 1.1,
        color: '#5a5f6e',
        size: 3,
        g: -1.5,
      });
    }
  }

  tracer(x: number, y: number, tx: number, ty: number, color: string, life = 0.12): void {
    if (this.tracers.length >= MAX_TRACERS) this.tracers.shift();
    this.tracers.push({ x, y, tx, ty, color, life, max: life });
  }

  ring(x: number, y: number, r: number, color: string, life = 0.3): void {
    if (this.rings.length >= MAX_RINGS) this.rings.shift();
    this.rings.push({ x, y, r, color, life, max: life });
  }

  burst(x: number, y: number, color: string, n: number, speed = 4): void {
    for (let i = 0; i < n && this.particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 2,
        life: 0.4 + Math.random() * 0.4,
        max: 0.8,
        color,
        size: 1 + Math.floor(Math.random() * 2),
      });
    }
  }

  text(x: number, y: number, text: string, color: string): void {
    if (this.texts.length >= MAX_TEXTS) this.texts.shift();
    this.texts.push({ x, y, life: 1, max: 1, text, color });
  }

  addShake(amount: number): void {
    this.shake = Math.min(1, this.shake + amount);
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += (p.g ?? 18) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= 1.6 * dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const tr of this.tracers) tr.life -= dt;
    this.tracers = this.tracers.filter((tr) => tr.life > 0);
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter((r) => r.life > 0);
    this.shake = Math.max(0, this.shake - dt * 2.5);
    this.squashLeft = Math.max(0, this.squashLeft - dt);
    this.hurtLeft = Math.max(0, this.hurtLeft - dt);
  }
}

/** Seconds between bubbles on one magma surface cell (each cell is offset by a hash). */
export const BUBBLE_PERIOD = 2.6;

function cellHash(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Slow sideways heat wave through molten rock: 0..1 brightness for a magma cell at time `t`. */
export function magmaPulse(tx: number, ty: number, t: number): number {
  return 0.5 + 0.5 * Math.sin(t * 1.7 - tx * 0.9 + ty * 0.6);
}

/**
 * A bubble on a magma surface cell: swells for the first 70% of its life, then pops.
 * Returns null while the cell is quiet. `x` is 0..1 across the cell, `r` 0..1 of a quarter cell,
 * `pop` true in the last 30% (draw a ring of spatter instead of a dome).
 */
export function magmaBubble(tx: number, ty: number, t: number): { x: number; r: number; pop: boolean; k: number } | null {
  const off = cellHash(tx, ty, 41) * BUBBLE_PERIOD;
  const cycle = Math.floor((t + off) / BUBBLE_PERIOD);
  // Only some cycles bubble, so the surface never ticks like a metronome.
  if (cellHash(tx, cycle, 43) > 0.45) return null;
  const k = ((t + off) % BUBBLE_PERIOD) / BUBBLE_PERIOD;
  const life = 0.55;
  if (k > life) return null;
  const p = k / life;
  const x = 0.2 + 0.6 * cellHash(tx, cycle, 47);
  return p < 0.7 ? { x, r: p / 0.7, pop: false, k: p } : { x, r: 1, pop: true, k: p };
}

/** An ember drifting up from a magma surface cell: offset in tiles above the surface and alpha, or null. */
export function magmaEmber(tx: number, ty: number, t: number): { dx: number; up: number; a: number } | null {
  const period = 3.4;
  const off = cellHash(tx, ty, 53) * period;
  const k = ((t + off) % period) / period;
  if (cellHash(tx, Math.floor((t + off) / period), 59) > 0.3 || k > 0.6) return null;
  const p = k / 0.6;
  return { dx: 0.3 + 0.4 * cellHash(tx, ty, 61) + 0.15 * Math.sin(p * 6), up: p * 1.6, a: 1 - p };
}
