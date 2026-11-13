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
  /** Drawn as a hollow 1 px outline (air bubbles). */
  hollow?: boolean;
  /** Drag toward zero sideways speed per second (bubbles wobble up, not fly). */
  drag?: number;
}

export interface Ring {
  x: number;
  y: number;
  life: number;
  max: number;
  /** Final radius in tiles. */
  r: number;
  color: string;
  /** Vertical squash 0..1 (1 = circle; splashes lie flat on the surface). */
  flat?: number;
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
  /** Pickup labels merge: item key and running count ("+3 Glowcorn"). */
  key?: string;
  n?: number;
}

const MAX_PARTICLES = 400;
/** Seconds between suit air bubbles while the helmet is under. */
export const BUBBLE_EVERY = 0.32;

/**
 * Splash strength 0..1 from the vertical speed (tiles/s) when the body crosses a liquid surface.
 * Wading in slowly makes no splash; a fall from a ledge makes a big one. Leaving is softer.
 */
export function splashPower(vy: number, entering: boolean): number {
  const v = entering ? vy : -vy;
  const p = (v - 2) / 14;
  const k = Math.max(0, Math.min(1, p));
  return entering ? k : k * 0.5;
}

/** Splash droplet colour for a liquid: light foam for water, the liquid's glow for acid/magma. */
export function splashColor(liquid: 'water' | 'acid' | 'magma'): { drop: string; foam: string } {
  if (liquid === 'acid') return { drop: '#9cff5a', foam: '#e4ffb8' };
  if (liquid === 'magma') return { drop: '#ff8a2a', foam: '#ffd27a' };
  return { drop: '#6ec3ff', foam: '#e8f6ff' };
}
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
/** Mix a #rrggbb colour toward white by k (0..1). */
export function lighten(hex: string, k: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  if (hex.length < 7 || Number.isNaN(n)) return '#e8e0d0';
  const ch = (v: number): string => Math.round(v + (255 - v) * k).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

/** Where a ground boss's fist lands, sideways from its centre (tiles): just past the body's edge. */
export function slamFistOffset(halfW: number): number {
  return halfW + 0.5;
}

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

/** Reduce-flashes cap for full-screen flashes (hurt vignette): never above 0.22 alpha. */
export const SOFT_FLASH_MAX = 0.22;

export function softFlash(alpha: number, reduce: boolean): number {
  return reduce ? Math.min(SOFT_FLASH_MAX, alpha * 0.5) : alpha;
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
  private bubbleAcc = 0;
  private vehAcc = 0;

  /**
   * Breaking a liquid surface at (x, top): a crown of droplets thrown up and out, foam on the
   * surface and a flat ring. Bigger and wider with `power` (0..1, see splashPower).
   */
  splash(x: number, top: number, power: number, c: { drop: string; foam: string }): number {
    if (power <= 0) return 0;
    const n = 6 + Math.round(power * 14);
    let made = 0;
    for (let i = 0; i < n && this.particles.length < MAX_PARTICLES; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const spread = 0.2 + Math.random() * 0.6;
      this.particles.push({
        x: x + side * Math.random() * 0.35,
        y: top - 0.05,
        vx: side * spread * (2 + power * 4),
        vy: -(3 + power * 7) * (0.55 + Math.random() * 0.45),
        life: 0.45 + Math.random() * 0.35,
        max: 0.8,
        color: i % 3 === 0 ? c.foam : c.drop,
        size: 1 + (Math.random() < 0.35 ? 1 : 0),
        g: 20,
      });
      made++;
    }
    for (let i = 0; i < 3 + Math.round(power * 3) && this.particles.length < MAX_PARTICLES; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.particles.push({
        x: x + side * (0.2 + Math.random() * 0.4),
        y: top - 0.02,
        vx: side * (0.6 + power * 1.6),
        vy: 0,
        life: 0.35 + Math.random() * 0.25,
        max: 0.6,
        color: c.foam,
        size: 2,
        g: 0,
        drag: 3,
      });
      made++;
    }
    this.ring(x, top, 0.6 + power * 1.2, c.foam, 0.3 + power * 0.15);
    this.rings[this.rings.length - 1].flat = 0.25;
    return made;
  }

  /** Air bubbles from the helmet while it is under liquid: one every BUBBLE_EVERY s, wobbling up. */
  bubbles(dt: number, under: boolean, x: number, y: number, facing: number, color: string): void {
    if (!under) {
      this.bubbleAcc = 0;
      return;
    }
    this.bubbleAcc += dt;
    while (this.bubbleAcc >= BUBBLE_EVERY && this.particles.length < MAX_PARTICLES) {
      this.bubbleAcc -= BUBBLE_EVERY;
      const big = Math.random() < 0.35;
      this.particles.push({
        x: x + facing * 0.25 + (Math.random() - 0.5) * 0.2,
        y,
        vx: (Math.random() - 0.5) * 1.4,
        vy: -1.2 - Math.random() * 0.8,
        life: 0.9 + Math.random() * 0.5,
        max: 1.4,
        color,
        size: big ? 4 : 3,
        g: -1.2,
        hollow: true,
        drag: 1.5,
      });
    }
  }

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

  /**
   * Boss slam impact at the boss's feet (x, y): a flat shockwave ring as wide as the slam's reach
   * (so the player sees where it hurt), a fast inner ring, rolling dust walls both ways in the ground's
   * colour and debris chunks thrown up from where each fist lands. Returns the particles made.
   */
  slamImpact(x: number, y: number, halfW: number, radius: number, ground: string, accent: string, shards?: { n: number; colors: string[] } | null): number {
    const before = this.particles.length;
    this.ring(x, y, radius, lighten(ground, 0.55), 0.55);
    this.rings[this.rings.length - 1].flat = 0.18;
    this.ring(x, y, radius * 0.45, accent, 0.28);
    this.rings[this.rings.length - 1].flat = 0.3;
    for (const dir of [-1, 1]) {
      this.dust(x + dir * halfW, y, ground, 9, 7, dir);
      const fx = x + dir * slamFistOffset(halfW);
      for (let i = 0; i < 7 && this.particles.length < MAX_PARTICLES; i++) {
        this.particles.push({
          x: fx + (Math.random() - 0.5) * 0.6,
          y: y - 0.1,
          vx: dir * (1 + Math.random() * 4) + (Math.random() - 0.5),
          vy: -5 - Math.random() * 6,
          life: 0.7 + Math.random() * 0.4,
          max: 1.1,
          color: i % 3 === 0 ? accent : ground,
          size: 2 + (i % 2),
          g: 24,
        });
      }
    }
    if (shards) {
      // Crystal / ice bosses: glittering shards fly high and tumble down slowly, spread over the reach.
      for (let i = 0; i < shards.n && this.particles.length < MAX_PARTICLES; i++) {
        const dir = i % 2 ? 1 : -1;
        this.particles.push({
          x: x + dir * Math.random() * halfW * 1.5,
          y: y - 0.2,
          vx: dir * (2 + Math.random() * 5),
          vy: -7 - Math.random() * 6,
          life: 0.9 + Math.random() * 0.5,
          max: 1.4,
          color: shards.colors[i % shards.colors.length],
          size: 2,
          g: 16,
        });
      }
    }
    this.addShake(0.8);
    return this.particles.length - before;
  }

  private scorchAcc = 0;
  /** Charred suit: thin dark smoke curls up off the player while `k` (0..1) lasts. */
  scorchSmoke(dt: number, k: number, x: number, y: number): void {
    if (k <= 0) {
      this.scorchAcc = 0;
      return;
    }
    this.scorchAcc += dt * 14 * k;
    while (this.scorchAcc >= 1) {
      this.scorchAcc -= 1;
      this.smoke(x, y, Math.random() < 0.3 ? '#6b5a50' : '#3a302c', 1);
    }
  }

  /** Lava sizzle: a hiss of embers and a puff of black smoke where the body touched the heat. */
  sizzle(x: number, y: number): void {
    this.burst(x, y, '#ffb347', 5, 4);
    this.burst(x, y, '#ff6a2a', 4, 3);
    this.smoke(x, y - 0.3, '#2e2622', 4);
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

  /**
   * Vehicle juice each frame: ground vehicles kick dust from both wheels and puff exhaust, the drill tank
   * throws sparks off its drill, the hoverbike sheds cyan motes and the Sky Jet leaves a contrail.
   * (x, y) is the rider's feet in tiles.
   */
  vehicleTrail(dt: number, kind: string | null, x: number, y: number, facing: number, vx: number, vy: number, onGround: boolean, ground: string): void {
    const speed = Math.hypot(vx, vy);
    if (!kind || speed < 1.5) {
      this.vehAcc = 0;
      return;
    }
    this.vehAcc += dt;
    const every = kind === 'sky_jet' ? 0.04 : 0.06;
    while (this.vehAcc >= every && this.particles.length < MAX_PARTICLES - 4) {
      this.vehAcc -= every;
      const back = -Math.sign(vx || facing);
      if ((kind === 'buggy' || kind === 'drill_tank') && onGround) {
        const fast = Math.min(1, Math.abs(vx) / 10);
        this.dust(x + back * 1.1, y, ground, 1 + (fast > 0.5 ? 1 : 0), 1.5 + fast * 2.5, back);
        this.dust(x - back * 0.9, y, ground, 1, 1 + fast * 1.5, back);
        if (Math.random() < 0.35) this.puff(x + back * 1.4, y - 0.7, kind === 'buggy' ? '#9aa0ad' : '#6b6f78', back);
        if (kind === 'drill_tank') {
          for (let i = 0; i < 2; i++) {
            this.particles.push({
              x: x - back * 1.7,
              y: y - 0.5 - Math.random() * 0.6,
              vx: -back * (2 + Math.random() * 4),
              vy: -2 - Math.random() * 3,
              life: 0.18 + Math.random() * 0.15,
              max: 0.33,
              color: Math.random() < 0.5 ? '#ffcf4a' : '#ff8a3c',
              size: 2,
              g: 14,
            });
          }
        }
      } else if (kind === 'hoverbike') {
        this.particles.push({ x: x + (Math.random() - 0.5) * 1.2, y: y + 0.1, vx: back * 1.2, vy: 0.6 + Math.random(), life: 0.35, max: 0.35, color: '#7ff6ff', size: 2, g: 0, drag: 2 });
      } else if (kind === 'sky_jet') {
        this.particles.push({ x: x + back * 1.5, y: y - 0.55, vx: back * 0.6, vy: (Math.random() - 0.5) * 0.4, life: 0.5, max: 0.5, color: 'rgba(235,242,255,0.8)', size: 3, g: 0, drag: 3 });
      }
    }
  }

  /** A soft rising smoke puff (exhaust). */
  private puff(x: number, y: number, color: string, dir: number): void {
    this.particles.push({ x, y, vx: dir * (0.6 + Math.random() * 0.6), vy: -0.6 - Math.random() * 0.5, life: 0.6, max: 0.6, color, size: 3, g: -0.5, drag: 1.5 });
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
    // Lift a new label above any fresh one it would sit on, so bursts stack instead of overprinting.
    let ty = y;
    for (let k = 0; k < 6; k++) {
      const hit = this.texts.some((t) => t.life > 0.45 && Math.abs(t.x - x) < 1.6 && Math.abs(t.y - ty) < 0.5);
      if (!hit) break;
      ty -= 0.55;
    }
    this.texts.push({ x, y: ty, life: 1, max: 1, text, color });
  }

  /** "+n Name" pickup label; repeats of the same item close by add up on one line instead of stacking. */
  pickup(x: number, y: number, key: string, name: string, color: string, n = 1): void {
    const same = this.texts.find((t) => t.key === key && t.life > 0.35 && Math.abs(t.x - x) < 2.5 && Math.abs(t.y - y) < 2.5);
    if (same) {
      same.n = (same.n ?? 1) + n;
      same.text = `+${same.n} ${name}`;
      same.life = same.max;
      return;
    }
    this.text(x, y, `+${n} ${name}`, color);
    const t = this.texts[this.texts.length - 1];
    t.key = key;
    t.n = n;
  }

  addShake(amount: number): void {
    this.shake = Math.min(1, this.shake + amount);
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += (p.g ?? 18) * dt;
      if (p.drag) p.vx *= Math.max(0, 1 - p.drag * dt);
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
