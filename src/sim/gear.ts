/**
 * Craftable gear: weapons, armor, abilities and vehicles. Crafted once at the workshop, owned forever
 * (never lost on death), equipped one per slot. Pure data plus a stats aggregator.
 */
import type { Inventory } from './tiles';
import { sanitizePrefixes, type PrefixId } from './rarity';

export type GearSlot = 'melee' | 'ranged' | 'head' | 'body' | 'feet' | 'back' | 'vehicle' | 'pet' | 'acc';
/** One item each. Accessories ('acc') are not here: up to ACC_SLOTS of them are worn at once (GearSave.acc). */
export const GEAR_SLOTS: GearSlot[] = ['melee', 'ranged', 'head', 'body', 'feet', 'back', 'vehicle', 'pet'];
/** Accessory sockets (trinkets on the belt, Terraria-style accessories). */
export const ACC_SLOTS = 3;

export type RangedKind = 'pulse' | 'rail' | 'scatter' | 'bomb';

export interface GearStats {
  /** Fraction of damage blocked (summed, capped at 0.6). */
  armor: number;
  digMul: number;
  /** Extra light radius in tiles. */
  light: number;
  maxHp: number;
  /** Battery drain multiplier underground. */
  drainMul: number;
  airJumps: number;
  dash: boolean;
  jetpack: boolean;
  glider: boolean;
  /** Pickup magnet radius in tiles. */
  magnet: number;
  /** Pet that zaps nearby enemies (damage per zap, 0 = none). */
  petZap: number;
  meleeDmg: number;
  meleeRange: number;
  meleeCd: number;
  ranged: RangedKind;
  rangedDmg: number;
  rangedCd: number;
  /** Mod chips (mods.ts): every bolt pierces, bolts bounce off walls this many times, HP healed per melee hit. */
  pierce: boolean;
  bounces: number;
  leech: number;
}

export interface GearDef {
  name: string;
  slot: GearSlot;
  desc: string;
  cost: Inventory;
  /** Stat changes applied on top of the base stats. */
  mod: Partial<GearStats>;
  /** Only won from a boss (never crafted). */
  bossOnly?: boolean;
  /** Built in a garage, not in the workshop. */
  garage?: boolean;
  /** Hand-tuned colours for the character (helmet, suit, boots, back item, vehicle body). */
  color: string;
  accent: string;
}

export type GearId =
  | 'energy_blade'
  | 'plasma_axe'
  | 'arc_spear'
  | 'pulse_pistol'
  | 'rail_rifle'
  | 'scatter_gun'
  | 'bomb_launcher'
  | 'scout_helm'
  | 'miner_helm'
  | 'plate_vest'
  | 'reactor_suit'
  | 'spring_boots'
  | 'dash_boots'
  | 'jetpack'
  | 'glider'
  | 'hoverbike'
  | 'sky_jet'
  | 'cargo_lifter'
  | 'buggy'
  | 'drill_tank'
  | 'junk_hammer'
  | 'thorn_whip'
  | 'prism_lance'
  | 'ember_cannon'
  | 'frost_core'
  | 'ai_crown'
  | 'plasma_saber'
  | 'core_plate'
  | 'scout_bot'
  | 'glow_moth'
  | 'spark_pup'
  | 'magnet_ring'
  | 'vital_heart'
  | 'lamp_shard'
  | 'power_coil'
  | 'grip_gloves'
  | 'aegis_charm'
  | 'feather_charm'
  | 'scrap_core'
  | 'bloom_seed'
  | 'prism_eye'
  | 'ember_wing'
  | 'frost_heart'
  | 'null_core';

export const GEAR: Record<GearId, GearDef> = {
  energy_blade: { name: 'Energy blade', slot: 'melee', desc: 'Quick arc, 12 damage', cost: {}, mod: {}, color: '#36e0e8', accent: '#c8ffff' },
  plasma_axe: { name: 'Plasma axe', slot: 'melee', desc: 'Heavy: 24 damage, wide, slower', cost: { metal: 8, copper_wire: 4, crystal: 3 }, mod: { meleeDmg: 24, meleeRange: 2.6, meleeCd: 0.45 }, color: '#ff7a3c', accent: '#ffd24a' },
  arc_spear: { name: 'Arc spear', slot: 'melee', desc: 'Long reach 3.4 tiles, 15 damage', cost: { iron_scrap: 10, copper_wire: 6, crystal: 2 }, mod: { meleeDmg: 15, meleeRange: 3.4, meleeCd: 0.3 }, color: '#b06bff', accent: '#e2c4ff' },
  pulse_pistol: { name: 'Pulse pistol', slot: 'ranged', desc: 'Basic bolt', cost: {}, mod: {}, color: '#ffd24a', accent: '#fff0a0' },
  rail_rifle: { name: 'Rail rifle', slot: 'ranged', desc: 'Fast bolt that pierces enemies, 16 damage', cost: { metal: 10, copper_wire: 6, crystal: 4 }, mod: { ranged: 'rail', rangedDmg: 16, rangedCd: 0.5 }, color: '#5aa6ff', accent: '#c8e8ff' },
  scatter_gun: { name: 'Scatter gun', slot: 'ranged', desc: 'Three bolts in a spread', cost: { iron_scrap: 12, copper_wire: 6 }, mod: { ranged: 'scatter', rangedDmg: 7, rangedCd: 0.55 }, color: '#ff9a3c', accent: '#ffd8a8' },
  bomb_launcher: { name: 'Bomb launcher', slot: 'ranged', desc: 'Lobbed bomb: blasts enemies and digs a crater', cost: { metal: 8, copper_wire: 8, crystal: 4 }, mod: { ranged: 'bomb', rangedDmg: 20, rangedCd: 0.9 }, color: '#7a8a5a', accent: '#ff5a5a' },
  scout_helm: { name: 'Scout helm', slot: 'head', desc: '+2 light radius, 5% armor', cost: { metal: 4, crystal: 2 }, mod: { light: 2, armor: 0.05 }, color: '#e6f6ff', accent: '#36e0e8' },
  miner_helm: { name: 'Miner helm', slot: 'head', desc: '+30% dig speed, +1 light', cost: { iron_scrap: 8, copper_wire: 3 }, mod: { digMul: 1.3, light: 1 }, color: '#ffcf4a', accent: '#ff9a3c' },
  plate_vest: { name: 'Plate vest', slot: 'body', desc: '25% armor, +20 health', cost: { metal: 12, iron_scrap: 6 }, mod: { armor: 0.25, maxHp: 20 }, color: '#8e98b0', accent: '#5d6a80' },
  reactor_suit: { name: 'Reactor suit', slot: 'body', desc: '15% armor, battery lasts 30% longer', cost: { metal: 8, crystal: 5, copper_wire: 5 }, mod: { armor: 0.15, drainMul: 0.7 }, color: '#36e0e8', accent: '#1f6f78' },
  spring_boots: { name: 'Spring boots', slot: 'feet', desc: 'Double jump', cost: { iron_scrap: 6, copper_wire: 4 }, mod: { airJumps: 1 }, color: '#7dffb0', accent: '#2fd07a' },
  dash_boots: { name: 'Dash boots', slot: 'feet', desc: 'Dash with Shift (or DASH)', cost: { iron_scrap: 6, crystal: 2 }, mod: { dash: true }, color: '#ff5a5a', accent: '#ffb0b0' },
  jetpack: { name: 'Jetpack', slot: 'back', desc: 'Hold jump in the air to fly (uses battery)', cost: { metal: 10, copper_wire: 8, crystal: 3 }, mod: { jetpack: true }, color: '#5d6a80', accent: '#ff9a3c' },
  glider: { name: 'Glider wings', slot: 'back', desc: 'Hold jump while falling to glide', cost: { biomass: 10, copper_wire: 4 }, mod: { glider: true }, color: '#c9a35a', accent: '#f0d08a' },
  buggy: { name: 'Dune buggy', slot: 'vehicle', desc: 'Garage: fast ground car that rams enemies', cost: { metal: 12, iron_scrap: 10, copper_wire: 6 }, mod: {}, garage: true, color: '#e85a3a', accent: '#ffcf4a' },
  drill_tank: { name: 'Drill tank', slot: 'vehicle', desc: 'Garage: armored digger that tunnels as it drives', cost: { metal: 18, iron_scrap: 14, copper_wire: 8, crystal: 4 }, mod: {}, garage: true, color: '#7a8a5a', accent: '#d6dde8' },
  hoverbike: { name: 'Hoverbike', slot: 'vehicle', desc: 'Garage: twice as fast, higher jumps, no fall damage', cost: { metal: 14, copper_wire: 8, crystal: 4 }, mod: {}, garage: true, color: '#e8a33d', accent: '#36e0e8' },
  junk_hammer: { name: 'Junk hammer', slot: 'melee', desc: 'Colossus trophy: 34 damage, huge knockback', cost: {}, mod: { meleeDmg: 34, meleeRange: 2.8, meleeCd: 0.5 }, bossOnly: true, color: '#c77a5e', accent: '#ff5a2a' },
  thorn_whip: { name: 'Thorn whip', slot: 'melee', desc: 'Vine Queen trophy: 4.5 tile reach, 20 damage', cost: {}, mod: { meleeDmg: 20, meleeRange: 4.5, meleeCd: 0.32 }, bossOnly: true, color: '#7fcf5a', accent: '#ff7ab8' },
  prism_lance: { name: 'Prism lance', slot: 'ranged', desc: 'Golem trophy: piercing beam, 26 damage', cost: {}, mod: { ranged: 'rail', rangedDmg: 26, rangedCd: 0.4 }, bossOnly: true, color: '#d8b8ff', accent: '#8ff4ff' },
  ember_cannon: { name: 'Ember cannon', slot: 'ranged', desc: 'Wyrm trophy: heavy bombs, 34 damage', cost: {}, mod: { ranged: 'bomb', rangedDmg: 34, rangedCd: 0.7 }, bossOnly: true, color: '#ff8a3c', accent: '#ffd24a' },
  frost_core: { name: 'Frost core armor', slot: 'body', desc: 'Titan trophy: 35% armor, +40 health', cost: {}, mod: { armor: 0.35, maxHp: 40 }, bossOnly: true, color: '#e6f6ff', accent: '#36e0e8' },
  ai_crown: { name: 'Crown of the Hollow', slot: 'head', desc: 'Final trophy: 20% armor, +4 light, +50% dig speed', cost: {}, mod: { armor: 0.2, light: 4, digMul: 1.5 }, bossOnly: true, color: '#ff5aff', accent: '#ffffff' },
  plasma_saber: { name: 'Plasma saber', slot: 'melee', desc: 'Deep-layer blade: 40 damage, 3 tile reach', cost: { plasma: 8, circuit: 6, metal: 10 }, mod: { meleeDmg: 40, meleeRange: 3, meleeCd: 0.3 }, color: '#ff5a8a', accent: '#ffd0e0' },
  core_plate: { name: 'Core plate', slot: 'body', desc: 'Deep-layer armor: 40% armor, +50 health', cost: { core_shard: 8, plasma: 6, metal: 20 }, mod: { armor: 0.4, maxHp: 50 }, color: '#5a2a7a', accent: '#ff5aff' },
  scout_bot: { name: 'Scout bot', slot: 'pet', desc: 'Pet: pulls in loot from 7 tiles, +1 light', cost: { metal: 6, copper_wire: 6, crystal: 2 }, mod: { magnet: 7, light: 1 }, color: '#9aa3b8', accent: '#36e0e8' },
  glow_moth: { name: 'Glow moth', slot: 'pet', desc: 'Pet: lights the way (+4 light)', cost: { biomass: 12, crystal: 3 }, mod: { light: 4 }, color: '#c8ffd8', accent: '#7dffb0' },
  spark_pup: { name: 'Spark pup', slot: 'pet', desc: 'Pet: zaps enemies near you (6 damage)', cost: { iron_scrap: 10, copper_wire: 8, crystal: 3 }, mod: { petZap: 6 }, color: '#ffcf4a', accent: '#ff9a3c' },
  // Accessories: small, stackable perks; three worn at once on the belt.
  magnet_ring: { name: 'Magnet ring', slot: 'acc', desc: 'Accessory: pulls in loot from 6 tiles', cost: { iron_scrap: 6, copper_wire: 4 }, mod: { magnet: 6 }, color: '#ff5a5a', accent: '#d6dde8' },
  vital_heart: { name: 'Vital heart', slot: 'acc', desc: 'Accessory: +15 health', cost: { biomass: 8, crystal: 2 }, mod: { maxHp: 15 }, color: '#ff7ab8', accent: '#ffd0e0' },
  lamp_shard: { name: 'Lamp shard', slot: 'acc', desc: 'Accessory: +2 light radius', cost: { crystal: 3, copper_wire: 2 }, mod: { light: 2 }, color: '#ffe27a', accent: '#ffffff' },
  power_coil: { name: 'Power coil', slot: 'acc', desc: 'Accessory: battery lasts 15% longer', cost: { copper_wire: 8, metal: 3 }, mod: { drainMul: 0.85 }, color: '#36e0e8', accent: '#c8ffff' },
  grip_gloves: { name: 'Grip gloves', slot: 'acc', desc: 'Accessory: +15% dig speed', cost: { iron_scrap: 8, biomass: 4 }, mod: { digMul: 1.15 }, color: '#e8a33d', accent: '#ffd8a8' },
  aegis_charm: { name: 'Aegis charm', slot: 'acc', desc: 'Accessory: 8% armor', cost: { metal: 6, crystal: 2 }, mod: { armor: 0.08 }, color: '#8e98b0', accent: '#e6f6ff' },
  feather_charm: { name: 'Feather charm', slot: 'acc', desc: 'Accessory: one extra jump in the air', cost: { biomass: 6, crystal: 4, copper_wire: 4 }, mod: { airJumps: 1 }, color: '#7dffb0', accent: '#ffffff' },
  // Boss-only accessories (loot.ts bossBonus): a boss kill can drop its own trinket, stronger than the craftables.
  scrap_core: { name: 'Scrap core', slot: 'acc', desc: 'Colossus trinket: +25 health, 6% armor', cost: {}, mod: { maxHp: 25, armor: 0.06 }, bossOnly: true, color: '#c77a5e', accent: '#ff5a2a' },
  bloom_seed: { name: 'Bloom seed', slot: 'acc', desc: 'Vine Queen trinket: melee hits heal 2 HP, +10 health', cost: {}, mod: { leech: 2, maxHp: 10 }, bossOnly: true, color: '#7fcf5a', accent: '#ff7ab8' },
  prism_eye: { name: 'Prism eye', slot: 'acc', desc: 'Golem trinket: +3 light radius, +20% dig speed', cost: {}, mod: { light: 3, digMul: 1.2 }, bossOnly: true, color: '#d8b8ff', accent: '#8ff4ff' },
  ember_wing: { name: 'Ember wing', slot: 'acc', desc: 'Wyrm trinket: one extra air jump, battery lasts 10% longer', cost: {}, mod: { airJumps: 1, drainMul: 0.9 }, bossOnly: true, color: '#ff8a3c', accent: '#ffd24a' },
  frost_heart: { name: 'Frost heart', slot: 'acc', desc: 'Titan trinket: 12% armor, +20 health', cost: {}, mod: { armor: 0.12, maxHp: 20 }, bossOnly: true, color: '#e6f6ff', accent: '#36e0e8' },
  null_core: { name: 'Null core', slot: 'acc', desc: 'Hollow AI trinket: battery lasts 30% longer, pulls loot from 8 tiles', cost: {}, mod: { drainMul: 0.7, magnet: 8 }, bossOnly: true, color: '#ff5aff', accent: '#ffffff' },
  sky_jet: { name: 'Sky Jet', slot: 'vehicle', desc: 'Garage: a small plane, fly anywhere (uses battery)', cost: { metal: 20, copper_wire: 12, crystal: 8 }, mod: {}, garage: true, color: '#5aa6ff', accent: '#ffffff' },
  cargo_lifter: { name: 'Cargo Lifter', slot: 'vehicle', desc: 'Garage: a heavy plane with a +30 cargo hold (uses battery)', cost: { metal: 26, iron_scrap: 12, copper_wire: 14, crystal: 10 }, mod: {}, garage: true, color: '#f0b43c', accent: '#ffffff' },
};

export const GEAR_IDS = Object.keys(GEAR) as GearId[];
/** Owned from the start. */
export const STARTER_GEAR: GearId[] = ['energy_blade', 'pulse_pistol'];

export type Loadout = Partial<Record<GearSlot, GearId>>;

export const BASE_STATS: GearStats = {
  armor: 0,
  digMul: 1,
  light: 0,
  maxHp: 0,
  drainMul: 1,
  airJumps: 0,
  dash: false,
  jetpack: false,
  glider: false,
  magnet: 3,
  petZap: 0,
  meleeDmg: 12,
  meleeRange: 2.1,
  meleeCd: 0.28,
  ranged: 'pulse',
  rangedDmg: 8,
  rangedCd: 0.3,
  pierce: false,
  bounces: 0,
  leech: 0,
};

/** Combine the equipped gear and worn accessories into one stat block. */
export function gearStats(equip: Loadout, acc: readonly GearId[] = []): GearStats {
  const s: GearStats = { ...BASE_STATS };
  const worn: GearId[] = [];
  for (const slot of GEAR_SLOTS) {
    const id = equip[slot];
    if (id) worn.push(id);
  }
  for (const id of acc.slice(0, ACC_SLOTS)) if (GEAR[id]?.slot === 'acc') worn.push(id);
  for (const id of worn) {
    const m = GEAR[id].mod;
    if (m.armor) s.armor += m.armor;
    if (m.digMul) s.digMul *= m.digMul;
    if (m.light) s.light += m.light;
    if (m.maxHp) s.maxHp += m.maxHp;
    if (m.drainMul) s.drainMul *= m.drainMul;
    if (m.airJumps) s.airJumps += m.airJumps;
    if (m.dash) s.dash = true;
    if (m.jetpack) s.jetpack = true;
    if (m.glider) s.glider = true;
    if (m.magnet) s.magnet = Math.max(s.magnet, m.magnet);
    if (m.petZap) s.petZap += m.petZap;
    if (m.leech) s.leech += m.leech;
    if (m.meleeDmg !== undefined) s.meleeDmg = m.meleeDmg;
    if (m.meleeRange !== undefined) s.meleeRange = m.meleeRange;
    if (m.meleeCd !== undefined) s.meleeCd = m.meleeCd;
    if (m.ranged) s.ranged = m.ranged;
    if (m.rangedDmg !== undefined) s.rangedDmg = m.rangedDmg;
    if (m.rangedCd !== undefined) s.rangedCd = m.rangedCd;
  }
  s.armor = Math.min(0.6, s.armor);
  return s;
}

export interface GearSave {
  owned: GearId[];
  equip: Loadout;
  /** v29: worn accessories, in socket order (at most ACC_SLOTS, owned, unique). */
  acc: GearId[];
  /** v30: rolled weapon prefix per owned weapon (rarity.ts) and how many reforges were paid (the roll's salt). */
  prefix: Partial<Record<GearId, PrefixId>>;
  reforges: number;
}

export function defaultGear(): GearSave {
  return { owned: [...STARTER_GEAR], equip: { melee: 'energy_blade', ranged: 'pulse_pistol' }, acc: [], prefix: {}, reforges: 0 };
}

/**
 * Which gear gives each mid-air jump, in the order they are spent (slots first, then accessories),
 * so the effect can show the item that fired. Pure.
 */
export function airJumpSources(equip: Loadout, acc: readonly GearId[] = []): GearId[] {
  const out: GearId[] = [];
  const ids = [...GEAR_SLOTS.map((sl) => equip[sl]), ...acc.slice(0, ACC_SLOTS)];
  for (const id of ids) if (id) for (let i = 0; i < (GEAR[id].mod.airJumps ?? 0); i++) out.push(id);
  return out;
}

export const isAccessory = (id: GearId): boolean => GEAR[id].slot === 'acc';

/**
 * Toggle an accessory in the sockets: worn -> taken off; otherwise it goes in the first free socket.
 * Returns the new list, or null when all sockets are full (the caller tells the player). Pure.
 */
export function toggleAccessory(acc: readonly GearId[], id: GearId): GearId[] | null {
  if (acc.includes(id)) return acc.filter((x) => x !== id);
  if (acc.length >= ACC_SLOTS) return null;
  return [...acc, id];
}

/** Never throws: unknown ids dropped, starters always owned, equipped items must be owned and in their slot. */
export function sanitizeGear(v: unknown): GearSave {
  const out = defaultGear();
  if (!v || typeof v !== 'object') return out;
  const r = v as Record<string, unknown>;
  if (Array.isArray(r.owned)) for (const id of r.owned) if (typeof id === 'string' && id in GEAR && !out.owned.includes(id as GearId)) out.owned.push(id as GearId);
  if (r.equip && typeof r.equip === 'object') {
    for (const slot of GEAR_SLOTS) {
      const id = (r.equip as Record<string, unknown>)[slot];
      if (typeof id === 'string' && id in GEAR && GEAR[id as GearId].slot === slot && out.owned.includes(id as GearId)) out.equip[slot] = id as GearId;
      else if (id === null) delete out.equip[slot];
    }
  }
  if (Array.isArray(r.acc)) {
    for (const id of r.acc) {
      if (out.acc.length >= ACC_SLOTS) break;
      if (typeof id === 'string' && id in GEAR && GEAR[id as GearId].slot === 'acc' && out.owned.includes(id as GearId) && !out.acc.includes(id as GearId)) out.acc.push(id as GearId);
    }
  }
  out.prefix = sanitizePrefixes(r.prefix, out.owned, (id) => GEAR[id].slot);
  out.reforges = typeof r.reforges === 'number' && Number.isFinite(r.reforges) && r.reforges > 0 ? Math.floor(r.reforges) : 0;
  return out;
}
