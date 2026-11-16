/** Chest loot: deterministic from the world seed and chest position. Free, visible, never paid. */
import { hash2 } from './rng';
import type { Inventory, ItemId } from './tiles';
import { GEAR_IDS, GEAR, type GearId } from './gear';
import { PREFIXES, RARITIES, pickPrefix, type PrefixId, type WeaponSlot } from './rarity';

interface LootRow {
  item: ItemId;
  min: number;
  max: number;
  /** Minimum depth (rows below the pad) for this row to roll. */
  depth: number;
  chance: number;
}

export const LOOT: LootRow[] = [
  { item: 'iron_scrap', min: 3, max: 7, depth: -99, chance: 0.9 },
  { item: 'copper_wire', min: 2, max: 5, depth: -99, chance: 0.6 },
  { item: 'torch', min: 2, max: 4, depth: -99, chance: 0.5 },
  { item: 'crystal', min: 1, max: 3, depth: -99, chance: 0.35 },
  { item: 'crystal', min: 2, max: 5, depth: 40, chance: 0.7 },
  { item: 'ladder', min: 3, max: 6, depth: -99, chance: 0.3 },
];

export function chestLoot(seed: number, x: number, y: number, depth: number): Inventory {
  const inv: Inventory = {};
  LOOT.forEach((row, i) => {
    if (depth < row.depth) return;
    if (hash2(x * 7 + i, y, seed ^ 0xc4e5) >= row.chance) return;
    const n = row.min + Math.floor(hash2(y + i, x, seed ^ 0x10e7) * (row.max - row.min + 1));
    inv[row.item] = (inv[row.item] ?? 0) + n;
  });
  if (Object.keys(inv).length === 0) inv.iron_scrap = 3;
  return inv;
}

/** Accessories that can turn up in world chests (all of them: they are also craftable, so finding one saves the cost). */
export const CHEST_ACCESSORIES: GearId[] = GEAR_IDS.filter((id) => GEAR[id].slot === 'acc' && !GEAR[id].bossOnly);

/** Chance that a world chest holds an accessory: 10% near the surface, rising with depth to 30%. */
export function accessoryChance(depth: number): number {
  return Math.min(0.3, 0.1 + Math.max(0, depth) / 400);
}

/**
 * The accessory found in a world chest the first time it is opened, or null. Deterministic from the seed and
 * chest position; never one the player already owns (so a find is always new). Pure.
 */
export function chestAccessory(seed: number, x: number, y: number, depth: number, owned: readonly GearId[]): GearId | null {
  if (hash2(x * 13 + 5, y * 3 + 1, seed ^ 0xacc5) >= accessoryChance(depth)) return null;
  const pool = CHEST_ACCESSORIES.filter((id) => !owned.includes(id));
  if (pool.length === 0) return null;
  return pool[Math.floor(hash2(y + 17, x + 3, seed ^ 0x7a1e) * pool.length) % pool.length];
}

/** Chance a boss drops its own trinket on the first kill; a repeat kill always drops it until owned (no endless farming). */
export const BOSS_TRINKET_FIRST = 0.5;
/** Once the boss trinket is owned, chance a kill still drops an unowned craftable accessory. */
export const BOSS_BONUS_CHANCE = 0.35;

/**
 * Boss bonus accessory roll (Terraria-style boss drops). `trinket` is the boss's own accessory;
 * `salt` varies per fight (deterministic from the sim). First kill: 50% for the trinket; any later
 * kill: the trinket for sure if still missing. With the trinket owned, 35% for a new craftable
 * accessory. Never returns one the player owns. Pure.
 */
export function bossBonus(seed: number, trinket: GearId, salt: number, first: boolean, owned: readonly GearId[]): GearId | null {
  const roll = hash2(salt | 0, trinket.length * 31 + 7, seed ^ 0xb055);
  if (!owned.includes(trinket)) return !first || roll < BOSS_TRINKET_FIRST ? trinket : null;
  if (roll >= BOSS_BONUS_CHANCE) return null;
  const pool = CHEST_ACCESSORIES.filter((id) => !owned.includes(id));
  if (pool.length === 0) return null;
  return pool[Math.floor(hash2(salt | 0, 91, seed ^ 0x51ee) * pool.length) % pool.length];
}

/** Weapons that can turn up in world chests: every craftable melee/ranged weapon (not starters or boss trophies). */
export const CHEST_WEAPONS: GearId[] = GEAR_IDS.filter((id) => (GEAR[id].slot === 'melee' || GEAR[id].slot === 'ranged') && !GEAR[id].bossOnly && Object.keys(GEAR[id].cost).length > 0);

/** Chance that a world chest holds a weapon (when it holds no accessory): 6% near the surface, rising to 20% deep. */
export function weaponChance(depth: number): number {
  return Math.min(0.2, 0.06 + Math.max(0, depth) / 500);
}

export interface WeaponFind {
  id: GearId;
  prefix: PrefixId;
}

/**
 * The weapon found in a world chest the first time it is opened, or null: always one the player does
 * not own yet, already rolled with a prefix at the printed reforge odds. Deterministic from the seed and
 * chest position. Pure.
 */
export function chestWeapon(seed: number, x: number, y: number, depth: number, owned: readonly GearId[]): WeaponFind | null {
  if (hash2(x * 11 + 3, y * 5 + 2, seed ^ 0x3ea9) >= weaponChance(depth)) return null;
  const pool = CHEST_WEAPONS.filter((id) => !owned.includes(id));
  if (pool.length === 0) return null;
  const id = pool[Math.floor(hash2(y + 29, x + 7, seed ^ 0x5bd1) * pool.length) % pool.length];
  const slot = GEAR[id].slot as WeaponSlot;
  return { id, prefix: pickPrefix(slot, hash2(x, y + 61, seed ^ 0x77a3), hash2(y, x + 43, seed ^ 0x19c4)) };
}

/** Rarity rank (0 common .. 2 epic) of a weapon prefix; no prefix is -1 so any roll beats it. */
export function rarityRank(p: PrefixId | undefined): number {
  return p ? RARITIES.indexOf(PREFIXES[p].rarity) : -1;
}

/**
 * Boss refight weapon roll: the boss's trophy weapon comes back honed with a rare-or-better prefix
 * (rare 75%, epic 25%), but only when that beats the trophy's current prefix, so refights stop paying
 * out once it is epic (no endless farming). Never on the first kill. Pure.
 */
export function bossWeapon(seed: number, trophy: GearId, salt: number, first: boolean, current: PrefixId | undefined): PrefixId | null {
  if (first) return null;
  const slot = GEAR[trophy].slot;
  if (slot !== 'melee' && slot !== 'ranged') return null;
  const r1 = 0.6 + 0.4 * hash2(salt | 0, 53, seed ^ 0x4f0e);
  const p = pickPrefix(slot, r1, hash2(salt | 0, 59, seed ^ 0x2c6b), current);
  return rarityRank(p) > rarityRank(current) ? p : null;
}
