/**
 * Night base raids (P1.8, slice 1). When night falls while the player is home and the base is worth
 * raiding, a wave marches in from the edges of the map toward the pad. Raiders chew through base
 * blocks they touch (the block drops as an item, nothing is destroyed for good); clearing the wave
 * pays a bonus into the stash. Opt-out in the workshop (settings.raids). Pure and deterministic.
 */
import { BASE_HALF, BASE_KEEP, BASE_ROWS } from './base';
import { ENEMIES, enemyBoxHits, type Enemy, type EnemyKind } from './enemies';
import { MACHINE_TILES } from './power';
import { hash2 } from './rng';
import { T, type Inventory } from './tiles';
import type { World } from './world';

/** Base value needed before raids start (two machines, or one machine and a dozen blocks). */
export const RAID_MIN_VALUE = 4;
export const RAID_MAX = 10;
/** Seconds between raiders entering. */
export const RAID_GAP = 1.6;
/** Raiders enter this many columns outside the base strip. */
export const RAID_ENTRY = 16;
/** Seconds of chewing to knock a base block loose. */
export const CHEW_TIME = 2.2;
/** Seconds of warning before nightfall when a raid is coming. */
export const RAID_WARN = 20;

/** Raiders go for the player instead of the base when within this many tiles. */
export const RAID_AGGRO = 6;

export interface RaidSpawn {
  kind: EnemyKind;
  side: -1 | 1;
  /** Seconds after the raid starts. */
  at: number;
}

export interface Raid {
  plan: RaidSpawn[];
  t: number;
  next: number;
  /** Enemy ids that belong to this raid and are still alive. */
  ids: number[];
  total: number;
}

/** What the base is worth to raiders: machines count double, plain blocks a sixth each. Pure. */
export function baseValue(world: World): number {
  let machines = 0;
  let blocks = 0;
  for (let dy = 1; dy <= BASE_ROWS; dy++) {
    for (let dx = -BASE_HALF; dx <= BASE_HALF; dx++) {
      const t = world.get(world.padX + dx, world.padY - dy);
      if (MACHINE_TILES.has(t)) machines++;
      else if (BASE_KEEP.has(t)) blocks++;
    }
  }
  return machines * 2 + Math.floor(blocks / 6);
}

/** Raiders in tonight's wave: grows with base value and nights survived, capped. 0 below the threshold. */
export function raidSize(value: number, cleared: number): number {
  if (value < RAID_MIN_VALUE) return 0;
  return Math.min(RAID_MAX, 2 + Math.floor((value - RAID_MIN_VALUE) / 3) + Math.min(3, Math.floor(cleared / 2)));
}

const GROUND: EnemyKind[] = ['crawler', 'crawler', 'mite'];
const AIR: EnemyKind[] = ['flyer', 'ember'];

/** The wave: alternating mix of walkers and fliers from seeded sides, one every RAID_GAP. Pure. */
export function raidPlan(seed: number, day: number, n: number): RaidSpawn[] {
  const out: RaidSpawn[] = [];
  for (let i = 0; i < n; i++) {
    const r = hash2(day, i, seed ^ 0x5a1d);
    const air = i % 3 === 2;
    const pool = air ? AIR : GROUND;
    const kind = pool[Math.floor(hash2(i, day, seed ^ 0x77) * pool.length) % pool.length];
    out.push({ kind, side: r < 0.5 ? -1 : 1, at: i * RAID_GAP });
  }
  return out;
}

/** True on the step where nightfall comes into the warning window (time -> time + dt crosses it). Pure. */
export function warnDue(isNight: (t: number) => boolean, time: number, dt: number): boolean {
  return !isNight(time) && isNight(time + RAID_WARN) && !isNight(time - dt + RAID_WARN);
}

/** Bonus banked for clearing a wave of n raiders. Pure. */
export function raidReward(n: number): Inventory {
  return { metal: n, copper_wire: Math.ceil(n / 2), crystal: Math.floor(n / 4) };
}

/** Where a raider marches: the player when close (and not on the pad), else the pad. */
export function raidTarget(e: Enemy, px: number, py: number, padX: number, padY: number, playerSafe: boolean): { x: number; y: number } {
  if (!playerSafe && Math.hypot(px - e.x, py - e.y) <= RAID_AGGRO) return { x: px, y: py };
  return { x: padX + 0.5, y: padY };
}

/** A base block touching the raider's box (sides first, then below), or null. Never the pad itself. */
export function chewTarget(world: World, e: Enemy): { x: number; y: number } | null {
  const d = ENEMIES[e.kind];
  const inBase = (x: number, y: number): boolean =>
    Math.abs(x - world.padX) <= BASE_HALF && y < world.padY && y >= world.padY - BASE_ROWS;
  const y0 = Math.floor(e.y - d.h);
  const y1 = Math.floor(e.y - 1e-6);
  const xl = Math.floor(e.x - d.halfW - 0.2);
  const xr = Math.floor(e.x + d.halfW + 0.2);
  const cells: [number, number][] = [];
  for (let y = y0; y <= y1; y++) cells.push([e.dir > 0 ? xr : xl, y], [e.dir > 0 ? xl : xr, y]);
  // Below only when it is a roof over open space: a floor block resting on ground is never chewed through.
  const bx = Math.floor(e.x);
  const by = Math.floor(e.y + 0.05);
  if (!world.isSolid(bx, by + 1)) cells.push([bx, by]);
  for (const [x, y] of cells) if (inBase(x, y) && BASE_KEEP.has(world.get(x, y)) && world.get(x, y) !== T.SPIKES) return { x, y };
  return null;
}

/** Every this many raids cleared, the wave drops a defence blueprint. */
export const BLUEPRINT_EVERY = 3;
export type RaidBlueprint = 'turret_mk2' | 'shield' | 'turret_mk3';
/** Raid-only blueprints in the order they drop; names for the toast and shop. */
export const RAID_BLUEPRINTS: readonly { id: RaidBlueprint; name: string }[] = [
  { id: 'turret_mk2', name: 'Turret Mk II' },
  { id: 'shield', name: 'Shield wall' },
  { id: 'turret_mk3', name: 'Turret Mk III' },
];

/** Raids cleared needed for a blueprint. Pure. */
export function blueprintRaids(id: RaidBlueprint): number {
  return (RAID_BLUEPRINTS.findIndex((b) => b.id === id) + 1) * BLUEPRINT_EVERY;
}

/** Has clearing `cleared` raids unlocked this blueprint? Derived from the raid count, so no save field. Pure. */
export function hasBlueprint(cleared: number, id: RaidBlueprint): boolean {
  return cleared >= blueprintRaids(id);
}

/** The blueprint that clearing raid number `cleared` (1-based count after the clear) just unlocked, or null. Pure. */
export function blueprintDrop(cleared: number): { id: RaidBlueprint; name: string } | null {
  if (cleared <= 0 || cleared % BLUEPRINT_EVERY !== 0) return null;
  return RAID_BLUEPRINTS[cleared / BLUEPRINT_EVERY - 1] ?? null;
}

/** Lift a freshly spawned raider out of any rock it landed in (at most 24 tiles). */
export function unstickEnemy(world: World, e: Enemy): void {
  for (let i = 0; i < 24 && enemyBoxHits(world, e); i++) e.y -= 1;
}
