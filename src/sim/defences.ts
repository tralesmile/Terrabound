/**
 * Raid defences (P1.8): powered turret blocks, spike traps and reinforced walls in the base.
 * Pure and deterministic: the game feeds in the world, enemies, grid state and dt; this returns shots and hits.
 */
import { BASE_HALF, BASE_ROWS } from './base';
import { clearLine } from './dronepath';
import { ENEMIES, type Enemy } from './enemies';
import { MACHINE_TILES } from './power';
export { TURRET_DRAW } from './power';
import { CHEW_TIME } from './raids';
import { T } from './tiles';
import type { World } from './world';

/** Tiles from the turret's barrel it will shoot at. */
export const TURRET_RANGE = 7.5;
/** Seconds between shots at full power (slower when the grid is short). */
export const TURRET_CD = 0.7;
export const TURRET_DMG = 6;
/** Spike damage per tick and the tick length (seconds). */
export const SPIKE_DMG = 5;
export const SPIKE_TICK = 0.5;
/** Raiders chew a reinforced wall this many times slower than a plain block. */
export const REINFORCED_MULT = 3;
/** Shield walls (raid blueprint) take this many times longer. */
export const SHIELD_MULT = 6;

/** Turret stats at a core tier (0 = Mk I, 1 = Mk II, 2 = Mk III; the shop's turret upgrade). Pure. */
export function turretStats(tier: number): { range: number; dmg: number; cd: number } {
  const t = Math.max(0, Math.min(2, Math.floor(tier)));
  return { range: TURRET_RANGE + t * 1.5, dmg: Math.round(TURRET_DMG * (1 + t * 0.5)), cd: TURRET_CD * (1 - t * 0.15) };
}

export interface Turret {
  x: number;
  y: number;
  /** Seconds until the next shot. */
  cd: number;
  /** Barrel angle (radians) for the renderer; points at the last target. */
  aim: number;
}

export interface TurretShot {
  x: number;
  y: number;
  tx: number;
  ty: number;
  id: number;
}

/** Seconds of chewing to knock a base block loose: reinforced walls take REINFORCED_MULT times longer. Pure. */
export function chewTime(tile: number): number {
  if (tile === T.SHIELD) return CHEW_TIME * SHIELD_MULT;
  return tile === T.REINFORCED ? CHEW_TIME * REINFORCED_MULT : CHEW_TIME;
}

/** Turret tiles in the base strip, keeping cooldown and aim for turrets that were already there. Pure. */
export function syncTurrets(world: World, prev: Turret[]): Turret[] {
  const out: Turret[] = [];
  for (let dy = 1; dy <= BASE_ROWS; dy++) {
    for (let dx = -BASE_HALF; dx <= BASE_HALF; dx++) {
      const x = world.padX + dx;
      const y = world.padY - dy;
      if (world.get(x, y) !== T.TURRET) continue;
      const old = prev.find((t) => t.x === x && t.y === y);
      out.push(old ?? { x, y, cd: 0, aim: -Math.PI / 2 });
    }
  }
  return out;
}

/** Target for a turret: raiders before wild enemies, then the nearest in range with a clear line. Pure. */
export function turretTarget(world: World, t: Turret, enemies: readonly Enemy[], range = TURRET_RANGE): Enemy | null {
  const ox = t.x + 0.5;
  const oy = t.y + 0.3;
  let best: Enemy | null = null;
  let bestScore = Infinity;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const cy = e.y - ENEMIES[e.kind].h / 2;
    const d = Math.hypot(e.x - ox, cy - oy);
    if (d > range) continue;
    const score = d - (e.raid ? 100 : 0);
    if (score >= bestScore) continue;
    if (!clearLine(world, ox, oy, e.x, cy)) continue;
    best = e;
    bestScore = score;
  }
  return best;
}

/**
 * Step every turret. `power` is the grid's met share (0..1): no power, no shots; half power, half the fire rate.
 * Mutates cooldown and aim; returns the shots fired this step (the game applies the damage). Pure.
 */
export function stepTurrets(world: World, turrets: Turret[], enemies: readonly Enemy[], power: number, dt: number, tier = 0): TurretShot[] {
  const shots: TurretShot[] = [];
  if (power <= 0) return shots;
  const st = turretStats(tier);
  for (const t of turrets) {
    t.cd = Math.max(0, t.cd - dt * Math.min(1, power));
    if (t.cd > 0) continue;
    const e = turretTarget(world, t, enemies, st.range);
    if (!e) continue;
    const tx = e.x;
    const ty = e.y - ENEMIES[e.kind].h / 2;
    t.aim = Math.atan2(ty - (t.y + 0.3), tx - (t.x + 0.5));
    t.cd = st.cd;
    shots.push({ x: t.x + 0.5, y: t.y + 0.3, tx, ty, id: e.id });
  }
  return shots;
}

/** Enemies whose box touches a spike trap tile (spikes sit on the floor and catch feet). Pure. */
export function spikeVictims(world: World, enemies: readonly Enemy[]): Enemy[] {
  const out: Enemy[] = [];
  for (const e of enemies) {
    if (e.hp <= 0 || ENEMIES[e.kind].flying) continue;
    const d = ENEMIES[e.kind];
    const y = Math.floor(e.y - 0.05);
    const x0 = Math.floor(e.x - d.halfW);
    const x1 = Math.floor(e.x + d.halfW - 1e-6);
    for (let x = x0; x <= x1; x++) {
      if (world.get(x, y) === T.SPIKES) {
        out.push(e);
        break;
      }
    }
  }
  return out;
}

/**
 * Where raiders head: the base machine nearest to them (they go for the valuable bits first), else the pad.
 * Pure; scans the 15 x 10 base strip.
 */
export function machineGoal(world: World, ex: number): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bd = Infinity;
  for (let dy = 1; dy <= BASE_ROWS; dy++) {
    for (let dx = -BASE_HALF; dx <= BASE_HALF; dx++) {
      const x = world.padX + dx;
      const y = world.padY - dy;
      if (!MACHINE_TILES.has(world.get(x, y))) continue;
      const d = Math.abs(x + 0.5 - ex) + dy * 0.01;
      if (d < bd) {
        bd = d;
        best = { x: x + 0.5, y: y + 1 };
      }
    }
  }
  return best;
}
