/**
 * Cinder cone eruptions: a cone near the player rumbles (glow, smoke, shake) for a couple of
 * seconds, then lobs a few lava bombs in slow arcs. Bombs burn on contact and splash where they
 * land; they never break blocks (bases stay safe). Pure: the caller passes the seeded rng and dt.
 */
import { T } from './tiles';
import type { World } from './world';
import type { Structure } from './structures';

export const ERUPT = {
  /** A cone only stirs while the player is within this many tiles (horizontally) and near the surface. */
  near: 36,
  /** Seconds of warning before the bombs fly. */
  rumbleT: 2.4,
  /** Seconds between eruptions while near (uniform in [minGap, maxGap]). */
  minGap: 26,
  maxGap: 48,
  /** Bombs per eruption (inclusive range). */
  minBombs: 4,
  maxBombs: 6,
  /** Launch speed: up (tiles/s) and the widest sideways speed. */
  minUp: 10,
  maxUp: 13,
  side: 7,
  /** Gravity on a bomb (lighter than on the player, so the arcs read). */
  gravity: 18,
  /** Damage to the player from a direct hit or a splash. */
  dmg: 12,
  /** Splash radius in tiles. */
  splash: 1.4,
  /** A bomb that flies this long without landing is dropped. */
  maxLife: 6,
} as const;

export interface LavaBomb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

/** The crater cell of a cone (centre of its apex). */
export function craterOf(s: Structure): { x: number; y: number } {
  return { x: (s.x0 + s.x1) >> 1, y: s.y0 };
}

/** A cone can erupt only while its crater still holds magma (a block dropped in plugs it). */
export function coneLive(world: World, s: Structure): boolean {
  const c = craterOf(s);
  return world.get(c.x, c.y) === T.MAGMA;
}

/** The nearest live cone within reach of the player, or null. */
export function nearestCone(world: World, px: number, py: number): Structure | null {
  let best: Structure | null = null;
  let bd = Infinity;
  for (const s of world.structures) {
    if (s.kind !== 'cone' || !coneLive(world, s)) continue;
    const c = craterOf(s);
    const d = Math.abs(c.x + 0.5 - px);
    if (d > ERUPT.near || Math.abs(c.y - py) > ERUPT.near * 0.6 || d >= bd) continue;
    best = s;
    bd = d;
  }
  return best;
}

/** Seconds until the next eruption. */
export function nextGap(rng: () => number): number {
  return ERUPT.minGap + rng() * (ERUPT.maxGap - ERUPT.minGap);
}

/** The bombs a cone throws: fanned left and right, launched from just above the crater. */
export function launchBombs(s: Structure, rng: () => number): LavaBomb[] {
  const c = craterOf(s);
  const n = ERUPT.minBombs + Math.floor(rng() * (ERUPT.maxBombs - ERUPT.minBombs + 1));
  const out: LavaBomb[] = [];
  for (let i = 0; i < n; i++) {
    // Alternate sides so every eruption spreads both ways.
    const dir = i % 2 === 0 ? 1 : -1;
    const vx = dir * (1.5 + rng() * (ERUPT.side - 1.5));
    const vy = -(ERUPT.minUp + rng() * (ERUPT.maxUp - ERUPT.minUp));
    out.push({ x: c.x + 0.5, y: c.y - 0.2, vx, vy, life: 0 });
  }
  return out;
}

/**
 * Moves a bomb by dt in small steps. Returns true when it lands (hits a solid block, liquid or the
 * world floor) and leaves it at the impact point. A bomb rising out of its own crater ignores it.
 */
export function stepBomb(world: World, b: LavaBomb, dt: number): boolean {
  const n = 4;
  for (let i = 0; i < n; i++) {
    b.vy += (ERUPT.gravity * dt) / n;
    b.x += (b.vx * dt) / n;
    b.y += (b.vy * dt) / n;
    b.life += dt / n;
    const tx = Math.floor(b.x);
    const ty = Math.floor(b.y);
    if (b.y >= world.h - 2 || tx < 0 || tx >= world.w) return true;
    if (b.vy > 0 && (world.isSolid(tx, ty) || world.get(tx, ty) === T.MAGMA || world.get(tx, ty) === T.WATER)) {
      b.y = ty;
      return true;
    }
  }
  return b.life > ERUPT.maxLife;
}

/** Whether a point (bomb) touches the player's box (feet at bx,by; h tall). */
export function bombHits(b: { x: number; y: number }, bx: number, by: number, h: number, r = 0.55): boolean {
  return Math.abs(b.x - bx) < 0.4 + r && b.y > by - h - r && b.y < by + r;
}
