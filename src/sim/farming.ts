/**
 * Farming slice 1 (P1.8 World): crop seeds planted on soil grow in two stages to ripe. Crops next to
 * water (a pond within reach, or a sprinkler) grow twice as fast. Cutting a ripe crop yields 2-3
 * produce (food) and 1-2 seeds; cutting it early gives the seed back. Seeds first come from wild
 * grass (by biome). Stage timers live in `world.crops` and are saved with the sapling diff. Pure.
 */
import { B } from './biomes';
import { hash2 } from './rng';
import { T, type ItemId } from './tiles';
import type { World } from './world';

export type CropId = 'glowcorn' | 'rustroot' | 'frostberry';
export const CROP_IDS: readonly CropId[] = ['glowcorn', 'rustroot', 'frostberry'];

export interface CropDef {
  name: string;
  seed: ItemId;
  produce: ItemId;
  /** Tiles for sprout, growing and ripe. */
  tiles: readonly [number, number, number];
}

export const CROPS: Record<CropId, CropDef> = {
  glowcorn: { name: 'Glowcorn', seed: 'corn_seed', produce: 'glowcorn', tiles: [T.CORN_1, T.CORN_2, T.CORN_3] },
  rustroot: { name: 'Rustroot', seed: 'root_seed', produce: 'rustroot', tiles: [T.ROOT_1, T.ROOT_2, T.ROOT_3] },
  frostberry: { name: 'Frostberry', seed: 'berry_seed', produce: 'frostberry', tiles: [T.BERRY_1, T.BERRY_2, T.BERRY_3] },
};

/** Seconds per growth stage when dry (two stages to ripe). */
export const STAGE_TIME = 60;
/** Watered crops grow this many times faster. */
export const WET_MUL = 2;
/** Sprinkler reach: columns either side and rows above/below. */
export const SPRINKLER_DX = 4;
export const SPRINKLER_DY = 2;
/** A natural pond waters crops within this many columns on the crop's row or the ground row. */
export const POND_DX = 3;
/** Chance that cutting wild grass also drops a crop seed for its biome. */
export const GRASS_SEED_CHANCE = 0.3;

const BY_TILE = new Map<number, { crop: CropId; stage: number }>();
for (const id of CROP_IDS) CROPS[id].tiles.forEach((t, stage) => BY_TILE.set(t, { crop: id, stage }));

/** Which crop and stage (0 sprout, 1 growing, 2 ripe) a tile is, or null. Pure. */
export function cropAt(tile: number): { crop: CropId; stage: number } | null {
  return BY_TILE.get(tile) ?? null;
}

export function isCropTile(tile: number): boolean {
  return BY_TILE.has(tile);
}

/** The crop a seed item plants, or null. */
export function cropOfSeed(item: ItemId): CropId | null {
  return CROP_IDS.find((c) => CROPS[c].seed === item) ?? null;
}

/** Crops near a pond or a sprinkler are watered. Pure. */
export function isWatered(world: World, x: number, y: number): boolean {
  for (let dy = -SPRINKLER_DY; dy <= SPRINKLER_DY; dy++) {
    for (let dx = -SPRINKLER_DX; dx <= SPRINKLER_DX; dx++) {
      const t = world.get(x + dx, y + dy);
      if (t === T.SPRINKLER) return true;
      if (t === T.WATER && Math.abs(dx) <= POND_DX && (dy === 0 || dy === 1)) return true;
    }
  }
  return false;
}

/** Plant a crop: the tile and its first stage timer. Caller checks soil and space. */
export function plantCrop(world: World, x: number, y: number, crop: CropId): void {
  world.set(x, y, CROPS[crop].tiles[0]);
  world.crops.set(y * world.w + x, STAGE_TIME);
}

/** Seconds until a crop at (x, y) is ripe at its current watering, or 0 when ripe / not a crop. Pure. */
export function ripeIn(world: World, x: number, y: number): number {
  const c = cropAt(world.get(x, y));
  if (!c || c.stage >= 2) return 0;
  const left = world.crops.get(y * world.w + x) ?? STAGE_TIME;
  const rest = (1 - c.stage) * STAGE_TIME;
  return (left + rest) / (isWatered(world, x, y) ? WET_MUL : 1);
}

/** Advance every growing crop by dt seconds; returns how many reached a new stage. */
export function stepCrops(world: World, dt: number): number {
  let grew = 0;
  for (const [i, left] of [...world.crops]) {
    const x = i % world.w;
    const y = Math.floor(i / world.w);
    const c = cropAt(world.get(x, y));
    if (!c || c.stage >= 2) {
      world.crops.delete(i);
      continue;
    }
    const t = left - dt * (isWatered(world, x, y) ? WET_MUL : 1);
    if (t > 0) {
      world.crops.set(i, t);
      continue;
    }
    const next = CROPS[c.crop].tiles[c.stage + 1];
    world.set(x, y, next); // clears the timer (set drops non-growing entries)
    if (c.stage + 1 < 2) world.crops.set(i, STAGE_TIME);
    grew++;
  }
  return grew;
}

/** What cutting a crop gives: ripe 2-3 produce and 1-2 seeds (hashed per cell), otherwise its seed back. Pure. */
export function harvestYield(tile: number, x: number, y: number, seed: number): { item: ItemId; n: number }[] {
  const c = cropAt(tile);
  if (!c) return [];
  const d = CROPS[c.crop];
  if (c.stage < 2) return [{ item: d.seed, n: 1 }];
  return [
    { item: d.produce, n: 2 + (hash2(x, y, seed + 11) < 0.5 ? 1 : 0) },
    { item: d.seed, n: 1 + (hash2(x, y, seed + 12) < 0.5 ? 1 : 0) },
  ];
}

/** Crop seed found in wild grass of a biome (deterministic per cell), or null. Pure. */
export function grassSeed(biome: number, x: number, y: number, seed: number): ItemId | null {
  if (hash2(x, y, seed + 31) >= GRASS_SEED_CHANCE) return null;
  const crop: CropId = biome === B.FROST ? 'frostberry' : biome === B.JUNGLE || biome === B.CRYSTAL ? 'glowcorn' : 'rustroot';
  return CROPS[crop].seed;
}

/** Meal buffs (cooking pot recipes): timed, never saved (a reload ends them). */
export type BuffId = 'charged' | 'sturdy' | 'swift';
export const BUFF_IDS: readonly BuffId[] = ['charged', 'sturdy', 'swift'];

export interface BuffDef {
  name: string;
  desc: string;
  color: string;
}

export const BUFFS: Record<BuffId, BuffDef> = {
  charged: { name: 'Charged', desc: 'deep-layer battery drain -40%', color: '#ffe36a' },
  sturdy: { name: 'Sturdy', desc: 'damage taken -25%', color: '#d8704a' },
  swift: { name: 'Swift', desc: 'run speed +20%', color: '#7ac8ff' },
};

/** Seconds a meal buff lasts (eating another of the same meal tops it back up, it does not stack). */
export const BUFF_TIME = 180;
export const CHARGED_DRAIN = 0.6;
export const STURDY_TAKEN = 0.75;
export const SWIFT_SPEED = 1.2;

/** Meal item -> the buff it gives. */
export const MEAL_BUFF: Partial<Record<ItemId, BuffId>> = { chowder: 'charged', stew: 'sturdy', tart: 'swift' };

export type Buffs = Partial<Record<BuffId, number>>;

/** Count buffs down by dt; expired ones are removed. Pure. */
export function stepBuffs(buffs: Buffs, dt: number): void {
  for (const id of BUFF_IDS) {
    const t = buffs[id];
    if (t === undefined) continue;
    if (t - dt <= 0) delete buffs[id];
    else buffs[id] = t - dt;
  }
}

/** True while a cooking pot stands in the base strip (meal recipes need one). Pure. */
export function hasPotIn(world: World, x0: number, x1: number, y0: number, y1: number): boolean {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (world.get(x, y) === T.POT) return true;
  return false;
}
