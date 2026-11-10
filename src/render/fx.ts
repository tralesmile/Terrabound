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
const MAX_TEXTS = 24;
const MAX_RINGS = 16;

export class Fx {
  particles: Particle[] = [];
  texts: FloatText[] = [];
  rings: Ring[] = [];
  shake = 0;

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
  }
}
