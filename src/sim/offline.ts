import { daylight } from './daynight';
import { SMELT_RUST, stepGrid, stepMining, stepDrones, stepSmelting } from './power';
import type { Inventory } from './tiles';

/** Machines keep working while the player is away, for at most this many seconds (8 h). */
export const OFFLINE_CAP = 8 * 3600;
/** Away shorter than this is not worth a summary. */
export const OFFLINE_MIN = 60;
const STEP = 15;

export interface MachineCounts {
  solars: number;
  smelters: number;
  batteries: number;
  miners: number;
  drones?: number;
}

export interface OfflineState {
  progressSmelt: number;
  progressMine: number;
  mineCount: number;
  droneProgress?: number;
  droneCount?: number;
  charge: number;
  time: number;
}

export interface OfflineResult extends Required<OfflineState> {
  seconds: number;
  rust: number;
  scrap: number;
  metal: number;
  wire: number;
  crystal: number;
}

/** Seconds away from two wall-clock stamps (ms). Clock skew (a stamp in the future, NaN) counts as zero; capped at 8 h. */
export function awaySeconds(savedAt: number, now: number): number {
  if (!Number.isFinite(savedAt) || !Number.isFinite(now) || savedAt <= 0) return 0;
  const s = (now - savedAt) / 1000;
  if (!(s > 0)) return 0;
  return Math.min(OFFLINE_CAP, s);
}

/**
 * Pure: advance the base machines by `seconds` in fixed steps and add the output to `stash` (mutated).
 * Uses the same step functions as live play, so offline and online production agree.
 */
export function simulateOffline(stash: Inventory, m: MachineCounts, st: OfflineState, seconds: number): OfflineResult {
  const before = { rust: stash.rust ?? 0, scrap: stash.iron_scrap ?? 0, metal: stash.metal ?? 0, wire: stash.copper_wire ?? 0, crystal: stash.crystal ?? 0 };
  let { progressSmelt, progressMine, mineCount, charge, time } = st;
  let droneProgress = st.droneProgress ?? 0;
  let droneCount = st.droneCount ?? 0;
  let left = Math.min(OFFLINE_CAP, Math.max(0, seconds));
  const total = left;
  while (left > 0) {
    const dt = Math.min(STEP, left);
    left -= dt;
    time += dt;
    const want = (stash.rust ?? 0) >= SMELT_RUST || progressSmelt > 0;
    const power = stepGrid(m.solars, m.smelters, m.batteries, daylight(time), want, charge, dt, m.miners, m.drones ?? 0);
    charge = power.charge;
    const mined = stepMining(stash, power, progressMine, mineCount, dt);
    progressMine = mined.progress;
    mineCount = mined.count;
    const flown = stepDrones(stash, power, droneProgress, droneCount, dt);
    droneProgress = flown.progress;
    droneCount = flown.count;
    if (power.working) progressSmelt = stepSmelting(stash, power, progressSmelt, dt).progress;
  }
  return {
    progressSmelt, progressMine, mineCount, droneProgress, droneCount, charge, time,
    wire: (stash.copper_wire ?? 0) - before.wire,
    crystal: (stash.crystal ?? 0) - before.crystal,
    seconds: total,
    // Rust is consumed by smelting, so report gross mined rust: net change plus rust spent (4 per metal).
    metal: (stash.metal ?? 0) - before.metal,
    scrap: (stash.iron_scrap ?? 0) - before.scrap,
    rust: (stash.rust ?? 0) - before.rust + ((stash.metal ?? 0) - before.metal) * SMELT_RUST,
  };
}
