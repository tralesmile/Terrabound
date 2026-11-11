import { BASE_HALF, BASE_ROWS } from './base';
import { T, invAdd, type Inventory } from './tiles';
import type { World } from './world';

/** Base power grid v1: every solar cell and smelter in the base strip shares one grid (wires and batteries come later). */
export const SOLAR_OUTPUT = 4;
export const SMELTER_DRAW = 3;
export const SMELT_TIME = 6;
export const SMELT_RUST = 4;
export const MACHINE_TILES: ReadonlySet<number> = new Set([T.SOLAR, T.SMELTER]);

export interface PowerState {
  solars: number;
  smelters: number;
  supply: number;
  demand: number;
  /** 0..1 share of demand that is met. */
  ratio: number;
  /** True while at least one smelter is actually working. */
  working: boolean;
}

export function newPower(): PowerState {
  return { solars: 0, smelters: 0, supply: 0, demand: 0, ratio: 0, working: false };
}

/** Count machines in the base strip (15 x 10 tiles, cheap). */
export function scanMachines(world: World): { solars: number; smelters: number } {
  let solars = 0;
  let smelters = 0;
  for (let dy = 1; dy <= BASE_ROWS; dy++) {
    for (let dx = -BASE_HALF; dx <= BASE_HALF; dx++) {
      const t = world.get(world.padX + dx, world.padY - dy);
      if (t === T.SOLAR) solars++;
      else if (t === T.SMELTER) smelters++;
    }
  }
  return { solars, smelters };
}

/** Pure: grid numbers for a machine count and daylight (0..1). Solar only works above ground in the base, so daylight scales it. */
export function gridState(solars: number, smelters: number, daylight: number, wantSmelt: boolean): PowerState {
  const supply = solars * SOLAR_OUTPUT * Math.max(0, Math.min(1, daylight));
  const demand = wantSmelt ? smelters * SMELTER_DRAW : 0;
  const ratio = demand <= 0 ? 0 : Math.min(1, supply / demand);
  return { solars, smelters, supply, demand, ratio, working: ratio > 0 && wantSmelt };
}

/**
 * Advance the smelters. `progress` is the carried seconds of work (one number for all smelters; each adds its share).
 * Returns the new progress and how many metal were produced. Mutates the stash.
 */
export function stepSmelting(stash: Inventory, state: PowerState, progress: number, dt: number): { progress: number; made: number } {
  if (!state.working) return { progress, made: 0 };
  progress += dt * state.ratio * state.smelters;
  let made = 0;
  while (progress >= SMELT_TIME && (stash.rust ?? 0) >= SMELT_RUST) {
    stash.rust = (stash.rust ?? 0) - SMELT_RUST;
    invAdd(stash, 'metal', 1);
    progress -= SMELT_TIME;
    made++;
  }
  // Without input the work does not pile up.
  if ((stash.rust ?? 0) < SMELT_RUST) progress = Math.min(progress, SMELT_TIME);
  return { progress, made };
}
