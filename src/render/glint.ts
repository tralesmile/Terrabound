/**
 * Ore glints: ore the light only just reaches twinkles now and then, so dim rock reads as "something
 * worth the battery over there". It never shows ore in the dark (no x-ray), and the material on the
 * TRACK card twinkles more often. Pure timing and selection; renderer.ts draws it.
 */
import { T, TILES, type ItemId } from '../sim/tiles';
import { hash2 } from '../sim/rng';

export const GLINT = {
  /** Light levels that glint: above 0 (the light must reach it), below the level where the ore is plain to see. */
  minLevel: 2,
  maxLevel: 26,
  period: 3.4,
  on: 0.45,
  trackedPeriod: 1.5,
  trackedOn: 0.6,
} as const;

const GLINT_COLOR: Readonly<Record<number, string>> = {
  [T.IRON]: '#ffe2c4',
  [T.COPPER]: '#ffb36b',
  [T.CRYSTAL]: '#a8f6ff',
  [T.CIRCUIT_ORE]: '#ffe45c',
  [T.PLASMA_ORE]: '#e6a8ff',
  [T.CORE_ORE]: '#ff8f7a',
};

export function glintColor(tile: number): string | null {
  return GLINT_COLOR[tile] ?? null;
}

export function glintsAt(tile: number, level: number): boolean {
  return GLINT_COLOR[tile] !== undefined && level >= GLINT.minLevel && level <= GLINT.maxLevel;
}

export function tracked(tile: number, wanted: ReadonlySet<ItemId>): boolean {
  const drop = TILES[tile]?.drop;
  return !!drop && wanted.has(drop);
}

/** 0 = nothing this frame, else the sparkle's strength (rises and falls over the flash). */
export function glintPhase(tx: number, ty: number, time: number, isTracked: boolean): number {
  const period = isTracked ? GLINT.trackedPeriod : GLINT.period;
  const on = isTracked ? GLINT.trackedOn : GLINT.on;
  const t = (time + hash2(tx, ty, 91) * period) % period;
  return t < on ? Math.sin((t / on) * Math.PI) : 0;
}
