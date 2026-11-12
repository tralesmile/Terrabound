/**
 * Fishing with the rod: cast onto water, wait for a bite, press again inside the bite window to land a catch.
 * Bite delay and catch are seeded by the world seed and the cast count (deterministic, no paid randomness).
 */
import { hash2 } from './rng';
import { T, type ItemId } from './tiles';
import type { World } from './world';

export interface Fishing {
  /** Bobber tile (a water cell at the surface). */
  x: number;
  y: number;
  t: number;
  biteAt: number;
  /** Seconds left in the current bite window (0 = no bite). */
  bite: number;
  cast: number;
}

export const CAST_RANGE = 10;
export const BITE_WINDOW = 0.9;
export const BITE_MIN = 2;
export const BITE_SPREAD = 5;

/** Food restores health and battery when eaten from the inventory. */
export const FOOD: Partial<Record<ItemId, { hp: number; battery: number }>> = {
  fish: { hp: 25, battery: 0 },
  glowfish: { hp: 50, battery: 40 },
  medkit: { hp: 60, battery: 0 },
  // Farm produce (farming.ts): small heals, glowcorn also tops up the battery.
  glowcorn: { hp: 15, battery: 25 },
  rustroot: { hp: 30, battery: 0 },
  frostberry: { hp: 20, battery: 10 },
  // Meals (farming.ts MEAL_BUFF) heal a bit and give a timed buff.
  chowder: { hp: 25, battery: 40 },
  stew: { hp: 45, battery: 0 },
  tart: { hp: 30, battery: 10 },
};

/**
 * Quick-heal pick (H / HUD button): among healing food in the pack, the smallest heal that covers
 * the missing HP (so a medkit is not spent on a scratch), else the biggest heal. Null when nothing
 * heals or HP is full. Pure.
 */
export function bestHeal(carried: Partial<Record<ItemId, number>>, missing: number): ItemId | null {
  if (missing <= 0) return null;
  const have = (Object.keys(FOOD) as ItemId[]).filter((id) => (FOOD[id]?.hp ?? 0) > 0 && (carried[id] ?? 0) > 0);
  if (!have.length) return null;
  const hp = (id: ItemId): number => FOOD[id]?.hp ?? 0;
  have.sort((a, b) => hp(a) - hp(b));
  return have.find((id) => hp(id) >= missing) ?? have[have.length - 1];
}

/** Total healing food in the pack (for the HUD heal button count). Pure. */
export function healCount(carried: Partial<Record<ItemId, number>>): number {
  let n = 0;
  for (const id of Object.keys(FOOD) as ItemId[]) if ((FOOD[id]?.hp ?? 0) > 0) n += carried[id] ?? 0;
  return n;
}

/** The water surface cell to cast at: the aimed cell if it is water, else the first water below it (6 rows). */
export function castTarget(world: World, px: number, py: number, tx: number, ty: number): { x: number; y: number } | null {
  if (Math.hypot(tx + 0.5 - px, ty + 0.5 - (py - 0.9)) > CAST_RANGE) return null;
  for (let y = ty; y < ty + 7 && y < world.h; y++) {
    if (world.get(tx, y) === T.WATER) {
      let top = y;
      while (top > 0 && world.get(tx, top - 1) === T.WATER) top--;
      return { x: tx, y: top };
    }
    if (world.isSolid(tx, y)) return null;
  }
  return null;
}

export function biteDelay(seed: number, cast: number): number {
  return BITE_MIN + hash2(cast, 11, seed) * BITE_SPREAD;
}

/** What comes up: mostly fish; glowfish at night or deep; sometimes crystal, seeds or junk. */
export function catchFor(seed: number, cast: number, depth: number, night: boolean): { item: ItemId; n: number } {
  const r = hash2(cast, 12, seed);
  const glow = night || depth > 30 ? 0.22 : 0.06;
  if (r < glow) return { item: 'glowfish', n: 1 };
  if (r < glow + 0.62) return { item: 'fish', n: 1 };
  if (r < glow + 0.74) return { item: 'crystal', n: 1 + Math.floor(hash2(cast, 13, seed) * 2) };
  if (r < glow + 0.86) return { item: 'seed', n: 1 };
  return { item: 'rust', n: 2 };
}
