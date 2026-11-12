import { BASE_HALF, BASE_ROWS } from './base';
import { T, invAdd, type Inventory } from './tiles';
import type { World } from './world';

/** Base power grid v1: every solar cell and smelter in the base strip shares one grid (wires and batteries come later). */
export const SOLAR_OUTPUT = 4;
export const SMELTER_DRAW = 3;
export const SMELT_TIME = 6;
export const SMELT_RUST = 4;
export const BATTERY_CAP = 60;
export const MINER_DRAW = 2;
/** Seconds of powered work per mined unit (per rig); every 4th unit is iron scrap instead of rust. */
export const MINE_TIME = 5;
/** Drone bay: a survey drone flies out and hauls back one load per DRONE_TIME powered seconds (copper wire, every 5th load a crystal). */
export const DRONE_DRAW = 3;
export const DRONE_TIME = 12;
/** Grid draw per base turret (defences.ts). */
export const TURRET_DRAW = 1;
export const MACHINE_TILES: ReadonlySet<number> = new Set([T.SOLAR, T.SMELTER, T.BATTERY, T.MINER, T.DRONE]);

export interface PowerState {
  solars: number;
  smelters: number;
  batteries: number;
  miners: number;
  drones: number;
  /** Stored energy and capacity (power-seconds). */
  charge: number;
  cap: number;
  supply: number;
  demand: number;
  /** 0..1 share of demand that is met. */
  ratio: number;
  /** True while at least one smelter is actually working. */
  working: boolean;
}

export function newPower(): PowerState {
  return { solars: 0, smelters: 0, batteries: 0, miners: 0, drones: 0, charge: 0, cap: 0, supply: 0, demand: 0, ratio: 0, working: false };
}

/** Count machines in the base strip (15 x 10 tiles, cheap). */
export function scanMachines(world: World): { solars: number; smelters: number; batteries: number; miners: number; drones: number } {
  let drones = 0;
  let miners = 0;
  let solars = 0;
  let smelters = 0;
  let batteries = 0;
  for (let dy = 1; dy <= BASE_ROWS; dy++) {
    for (let dx = -BASE_HALF; dx <= BASE_HALF; dx++) {
      const t = world.get(world.padX + dx, world.padY - dy);
      if (t === T.SOLAR) solars++;
      else if (t === T.SMELTER) smelters++;
      else if (t === T.BATTERY) batteries++;
      else if (t === T.MINER) miners++;
      else if (t === T.DRONE) drones++;
    }
  }
  return { solars, smelters, batteries, miners, drones };
}

/** Pure: grid numbers for a machine count and daylight (0..1). Solar only works above ground in the base, so daylight scales it. */
export function gridState(solars: number, smelters: number, daylight: number, wantSmelt: boolean, miners = 0, drones = 0, turrets = 0): PowerState {
  const supply = solars * SOLAR_OUTPUT * Math.max(0, Math.min(1, daylight));
  const demand = (wantSmelt ? smelters * SMELTER_DRAW : 0) + miners * MINER_DRAW + drones * DRONE_DRAW + turrets * TURRET_DRAW;
  const ratio = demand <= 0 ? 0 : Math.min(1, supply / demand);
  return { solars, smelters, batteries: 0, miners, drones, charge: 0, cap: 0, supply, demand, ratio, working: ratio > 0 && wantSmelt };
}

/**
 * Pure: one time step with batteries. Surplus solar charges them; a deficit (night, too many smelters) drains them.
 * Returns the grid state for this step and the new stored charge (clamped to capacity, so removing batteries drops it).
 */
export function stepGrid(solars: number, smelters: number, batteries: number, daylight: number, wantSmelt: boolean, charge: number, dt: number, miners = 0, drones = 0, turrets = 0): PowerState {
  const base = gridState(solars, smelters, daylight, wantSmelt, miners, drones, turrets);
  const cap = batteries * BATTERY_CAP;
  let c = Math.max(0, Math.min(cap, charge));
  let ratio = base.ratio;
  if (dt > 0) {
    const surplus = base.supply - base.demand;
    if (surplus >= 0) c = Math.min(cap, c + surplus * dt);
    else {
      const draw = Math.min(c, -surplus * dt);
      c -= draw;
      ratio = Math.min(1, (base.supply + draw / dt) / base.demand);
    }
  }
  return { ...base, batteries, charge: c, cap, ratio, working: ratio > 0 && wantSmelt };
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

/**
 * Advance the miner rigs. `progress` is carried powered work-seconds (all rigs share it). Each finished unit adds 1 rust,
 * and every 4th unit (counted by `count`, so it is deterministic) adds 1 iron scrap instead.
 */
export function stepMining(stash: Inventory, state: PowerState, progress: number, count: number, dt: number): { progress: number; count: number; made: number } {
  if (state.miners <= 0 || state.ratio <= 0 || dt <= 0) return { progress, count, made: 0 };
  progress += dt * state.ratio * state.miners;
  let made = 0;
  while (progress >= MINE_TIME) {
    progress -= MINE_TIME;
    count++;
    invAdd(stash, count % 4 === 0 ? 'iron_scrap' : 'rust', 1);
    made++;
  }
  return { progress, count, made };
}

/**
 * Advance the drone bays. Same shape as `stepMining`; each finished load is 1 copper wire, every 5th load (by `count`) 1 crystal.
 * This is the first source of crystal that does not need a dive.
 */
export function stepDrones(stash: Inventory, state: PowerState, progress: number, count: number, dt: number): { progress: number; count: number; made: number } {
  if (state.drones <= 0 || state.ratio <= 0 || dt <= 0) return { progress, count, made: 0 };
  progress += dt * state.ratio * state.drones;
  let made = 0;
  while (progress >= DRONE_TIME) {
    progress -= DRONE_TIME;
    count++;
    invAdd(stash, count % 5 === 0 ? 'crystal' : 'copper_wire', 1);
    made++;
  }
  return { progress, count, made };
}

/**
 * First-automation tutorial beat: one fading line at the base that points at the next step (craft solar, craft a miner,
 * place both). Returns null once a rig is running or when nothing useful can be said yet. Pure.
 */
export function automationHint(counts: { solars: number; miners: number }, have: Inventory, ratio: number, touch: boolean, fab = 2): string | null {
  if (counts.miners > 0 && counts.solars > 0 && ratio > 0) return null;
  const tap = touch ? 'tap' : 'press';
  if (counts.solars === 0) {
    if (fab < 1) return (have.iron_scrap ?? 0) >= 6 && (have.rust ?? 0) >= 10 ? 'Workshop: upgrade the Fabricator to unlock machines' : null;
    if ((have.metal ?? 0) >= 2 && (have.crystal ?? 0) >= 1) return `Workshop: make a Solar Cell, then ${tap} its hotbar slot and build it in the base`;
    return null;
  }
  if (counts.miners === 0) {
    if (fab < 2) return (have.metal ?? 0) >= 6 && (have.copper_wire ?? 0) >= 4 ? 'Workshop: upgrade the Fabricator to Lv 2 for the Miner Rig' : null;
    if ((have.metal ?? 0) >= 3 && (have.copper_wire ?? 0) >= 2) return 'Workshop: make a Miner Rig and place it next to your solar cell';
    return null;
  }
  return 'Machines need daylight or a battery to run';
}
