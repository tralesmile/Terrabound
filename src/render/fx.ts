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

export class Fx {
  particles: Particle[] = [];
  texts: FloatText[] = [];
  shake = 0;

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
      p.vy += 18 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= 1.6 * dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    this.shake = Math.max(0, this.shake - dt * 2.5);
  }
}
