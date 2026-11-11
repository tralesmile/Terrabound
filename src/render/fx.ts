/** Cosmetic effects only. Nothing here may affect game state, so the simulation stays deterministic and testable. */

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

/** Squash strength from a landing speed in tiles/s (soft hops barely squash). */
export function landPower(speed: number): number {
  return Math.max(0, Math.min(1, (speed - 4) / 14));
}
const MAX_TEXTS = 24;
const MAX_RINGS = 16;

export class Fx {
  particles: Particle[] = [];
  texts: FloatText[] = [];
  rings: Ring[] = [];
  shake = 0;
  /** Landing squash timer and strength (read by the renderer). */
  squashLeft = 0;
  squashPower = 0;
  private stepAcc = 0;

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
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter((r) => r.life > 0);
    this.shake = Math.max(0, this.shake - dt * 2.5);
    this.squashLeft = Math.max(0, this.squashLeft - dt);
  }
}
