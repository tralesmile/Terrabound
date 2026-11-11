/**
 * Craftable gear: weapons, armor, abilities and vehicles. Crafted once at the workshop, owned forever
 * (never lost on death), equipped one per slot. Pure data plus a stats aggregator.
 */
import type { Inventory } from './tiles';

export type GearSlot = 'melee' | 'ranged' | 'head' | 'body' | 'feet' | 'back' | 'vehicle';
export const GEAR_SLOTS: GearSlot[] = ['melee', 'ranged', 'head', 'body', 'feet', 'back', 'vehicle'];

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
  meleeDmg: number;
  meleeRange: number;
  meleeCd: number;
  ranged: RangedKind;
  rangedDmg: number;
  rangedCd: number;
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
  | 'junk_hammer'
  | 'thorn_whip'
  | 'prism_lance'
  | 'ember_cannon'
  | 'frost_core';

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
  hoverbike: { name: 'Hoverbike', slot: 'vehicle', desc: 'Ride with V: twice as fast, higher jumps, no fall damage', cost: { metal: 14, copper_wire: 8, crystal: 4 }, mod: {}, color: '#e8a33d', accent: '#36e0e8' },
  junk_hammer: { name: 'Junk hammer', slot: 'melee', desc: 'Colossus trophy: 34 damage, huge knockback', cost: {}, mod: { meleeDmg: 34, meleeRange: 2.8, meleeCd: 0.5 }, bossOnly: true, color: '#c77a5e', accent: '#ff5a2a' },
  thorn_whip: { name: 'Thorn whip', slot: 'melee', desc: 'Vine Queen trophy: 4.5 tile reach, 20 damage', cost: {}, mod: { meleeDmg: 20, meleeRange: 4.5, meleeCd: 0.32 }, bossOnly: true, color: '#7fcf5a', accent: '#ff7ab8' },
  prism_lance: { name: 'Prism lance', slot: 'ranged', desc: 'Golem trophy: piercing beam, 26 damage', cost: {}, mod: { ranged: 'rail', rangedDmg: 26, rangedCd: 0.4 }, bossOnly: true, color: '#d8b8ff', accent: '#8ff4ff' },
  ember_cannon: { name: 'Ember cannon', slot: 'ranged', desc: 'Wyrm trophy: heavy bombs, 34 damage', cost: {}, mod: { ranged: 'bomb', rangedDmg: 34, rangedCd: 0.7 }, bossOnly: true, color: '#ff8a3c', accent: '#ffd24a' },
  frost_core: { name: 'Frost core armor', slot: 'body', desc: 'Titan trophy: 35% armor, +40 health', cost: {}, mod: { armor: 0.35, maxHp: 40 }, bossOnly: true, color: '#e6f6ff', accent: '#36e0e8' },
  sky_jet: { name: 'Sky Jet', slot: 'vehicle', desc: 'Ride with V and fly anywhere: jump climbs, S dives (uses battery)', cost: { metal: 20, copper_wire: 12, crystal: 8 }, mod: {}, color: '#5aa6ff', accent: '#ffffff' },
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
  meleeDmg: 12,
  meleeRange: 2.1,
  meleeCd: 0.28,
  ranged: 'pulse',
  rangedDmg: 8,
  rangedCd: 0.3,
};

/** Combine the equipped gear into one stat block. */
export function gearStats(equip: Loadout): GearStats {
  const s: GearStats = { ...BASE_STATS };
  for (const slot of GEAR_SLOTS) {
    const id = equip[slot];
    if (!id) continue;
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
}

export function defaultGear(): GearSave {
  return { owned: [...STARTER_GEAR], equip: { melee: 'energy_blade', ranged: 'pulse_pistol' } };
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
  return out;
}
