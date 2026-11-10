/** Environmental hazards: acid drips, falling debris (both telegraphed) and gas pockets. Pure and deterministic. */
import { hash2 } from './rng';
import type { World } from './world';

export type FallKind = 'acid' | 'debris';

/** A telegraphed falling object. While warn > 0 it hangs in place (render shows a warning). */
export interface Faller {
  kind: FallKind;
  x: number;
  y: number;
  vy: number;
  warn: number;
}

/** Ceiling spot that periodically drips acid. */
export interface Emitter {
  x: number;
  y: number;
  /** Seconds until the next drip starts to form. */
  cd: number;
}

/** Circular pocket of toxic gas in a cave. */
export interface GasPocket {
  x: number;
  y: number;
  r: number;
}

export const HAZARD = {
  acidMinDepth: 10,
  acidWarn: 0.7,
  acidPeriod: 3.2,
  acidDmg: 10,
  debrisMinDepth: 14,
  debrisWarn: 1.0,
  debrisDmg: 18,
  debrisPeriod: 7,
  gasMinDepth: 28,
  gasDps: 5,
  fallGravity: 30,
  fallMax: 22,
  hitW: 0.25,
} as const;

export const FALLER_DMG: Record<FallKind, number> = { acid: HAZARD.acidDmg, debris: HAZARD.debrisDmg };

export interface HazardField {
  emitters: Emitter[];
  gas: GasPocket[];
}

/** Deterministic hazard placement from the world seed. Never within the base area. */
export function placeHazards(world: World): HazardField {
  const emitters: Emitter[] = [];
  const gas: GasPocket[] = [];
  const seed = world.seed ^ 0xac1d;
  for (let x = 2; x < world.w - 2; x++) {
    for (let y = world.padY + HAZARD.acidMinDepth; y < world.h - 4; y++) {
      const depth = y - world.padY;
      if (world.get(x, y) !== 0) continue;
      // Acid: air tile directly under solid rock, with room to fall.
      if (world.isSolid(x, y - 1) && !world.isSolid(x, y + 1) && hash2(x, y, seed) < 0.03) {
        emitters.push({ x: x + 0.5, y, cd: hash2(y, x, seed + 1) * HAZARD.acidPeriod });
      }
      // Gas: open cave air deeper down, rare.
      if (depth >= HAZARD.gasMinDepth && !world.isSolid(x, y + 1) && hash2(x, y, seed + 2) < 0.0012) {
        gas.push({ x: x + 0.5, y: y + 0.5, r: 2 + hash2(x, y, seed + 3) * 1.5 });
      }
    }
  }
  return { emitters, gas };
}

export function inGas(gas: GasPocket[], px: number, py: number): boolean {
  for (const g of gas) if (Math.hypot(px - g.x, py - g.y) <= g.r) return true;
  return false;
}

/** Advance one faller. Returns false when it has landed (remove it). */
export function stepFaller(world: World, f: Faller, dt: number): boolean {
  if (f.warn > 0) {
    f.warn -= dt;
    return true;
  }
  f.vy = Math.min(HAZARD.fallMax, f.vy + HAZARD.fallGravity * dt);
  f.y += f.vy * dt;
  if (world.isSolid(Math.floor(f.x), Math.floor(f.y)) || f.y >= world.h) return false;
  return true;
}

/** True when a live (not just warning) faller overlaps the player box (x centre, y feet). */
export function fallerHits(f: Faller, px: number, py: number, halfW: number, h: number): boolean {
  if (f.warn > 0) return false;
  return Math.abs(f.x - px) < halfW + HAZARD.hitW && f.y > py - h && f.y < py + 0.2;
}

/** Find a ceiling tile above (x, y) within `reach` tiles: returns the air row just under it, or -1. */
export function findCeiling(world: World, x: number, y: number, reach: number): number {
  for (let dy = 1; dy <= reach; dy++) {
    if (world.isSolid(x, y - dy)) return y - dy + 1;
    if (y - dy < 0) return -1;
  }
  return -1;
}
