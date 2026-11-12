/**
 * Weapon mod chips (P1.8 Characters: the Gunsmith). Rook the Gunsmith robot builds chips at fixed,
 * visible prices once it lives in the base. A chip is owned forever and one can be fitted to each
 * weapon slot (melee, ranged); swapping is free at the base. Chips change how a weapon plays, not
 * only its numbers, so every loadout feels different. Pure data plus the stat folding.
 */
import type { GearStats } from './gear';
import type { Inventory } from './tiles';

export type ModSlot = 'melee' | 'ranged';

export type ModId = 'overcharge' | 'hair_trigger' | 'piercer' | 'ricochet' | 'keen_edge' | 'leech' | 'quick_grip';

export interface ModDef {
  name: string;
  slot: ModSlot;
  desc: string;
  cost: Inventory;
  /** Chip colour (icon and the glow on the weapon). */
  color: string;
}

export const MODS: Record<ModId, ModDef> = {
  overcharge: { name: 'Overcharge chip', slot: 'ranged', desc: '+35% shot damage', cost: { copper_wire: 6, crystal: 3 }, color: '#ff5a5a' },
  hair_trigger: { name: 'Hair trigger', slot: 'ranged', desc: 'Fires 30% faster', cost: { iron_scrap: 10, copper_wire: 4 }, color: '#ffd23a' },
  piercer: { name: 'Piercer chip', slot: 'ranged', desc: 'Bolts pass through enemies', cost: { metal: 6, crystal: 4 }, color: '#5aa6ff' },
  ricochet: { name: 'Ricochet chip', slot: 'ranged', desc: 'Bolts bounce off walls twice', cost: { metal: 4, copper_wire: 6, circuit: 1 }, color: '#7dffb0' },
  keen_edge: { name: 'Keen edge', slot: 'melee', desc: '+30% damage, +0.6 reach', cost: { metal: 6, crystal: 2 }, color: '#36e0e8' },
  leech: { name: 'Leech chip', slot: 'melee', desc: 'Each hit heals you 3 HP', cost: { biomass: 10, crystal: 4 }, color: '#ff7ab8' },
  quick_grip: { name: 'Quick grip', slot: 'melee', desc: 'Swings 25% faster', cost: { iron_scrap: 10, copper_wire: 4 }, color: '#ff9a3c' },
};

export const MOD_IDS = Object.keys(MODS) as ModId[];

/** Bolts with the ricochet chip bounce this many times before they fizzle. */
export const RICOCHET_BOUNCES = 2;
/** HP healed per melee hit with the leech chip. */
export const LEECH_HEAL = 3;

/** Chips owned and the chip fitted per weapon slot. */
export interface ModSave {
  owned: ModId[];
  fit: Partial<Record<ModSlot, ModId>>;
}

export function defaultMods(): ModSave {
  return { owned: [], fit: {} };
}

/** Never throws: unknown or duplicate ids dropped, a fitted chip must be owned and match its slot. */
export function sanitizeMods(v: unknown): ModSave {
  const out = defaultMods();
  if (!v || typeof v !== 'object') return out;
  const r = v as Record<string, unknown>;
  if (Array.isArray(r.owned)) for (const id of r.owned) if (typeof id === 'string' && id in MODS && !out.owned.includes(id as ModId)) out.owned.push(id as ModId);
  if (r.fit && typeof r.fit === 'object') {
    for (const slot of ['melee', 'ranged'] as const) {
      const id = (r.fit as Record<string, unknown>)[slot];
      if (typeof id === 'string' && id in MODS && MODS[id as ModId].slot === slot && out.owned.includes(id as ModId)) out.fit[slot] = id as ModId;
    }
  }
  return out;
}

/** Fold the fitted chips into a gear stat block (returns a new block). Pure. */
export function applyMods(s: GearStats, fit: ModSave['fit']): GearStats {
  const o: GearStats = { ...s };
  switch (fit.ranged) {
    case 'overcharge':
      o.rangedDmg = Math.round(o.rangedDmg * 1.35);
      break;
    case 'hair_trigger':
      o.rangedCd *= 0.7;
      break;
    case 'piercer':
      o.pierce = true;
      break;
    case 'ricochet':
      o.bounces = RICOCHET_BOUNCES;
      break;
  }
  switch (fit.melee) {
    case 'keen_edge':
      o.meleeDmg = Math.round(o.meleeDmg * 1.3);
      o.meleeRange += 0.6;
      break;
    case 'leech':
      o.leech = LEECH_HEAL;
      break;
    case 'quick_grip':
      o.meleeCd *= 0.75;
      break;
  }
  return o;
}

/** Fit an owned chip (fitting the chip already in its slot takes it out). Returns false when not owned. */
export function fitMod(save: ModSave, id: ModId): boolean {
  if (!save.owned.includes(id)) return false;
  const slot = MODS[id].slot;
  if (save.fit[slot] === id) delete save.fit[slot];
  else save.fit[slot] = id;
  return true;
}

/** Reflect a velocity off the solid cell a bolt just entered, given the cell it came from. Pure. */
export function bounce(vx: number, vy: number, fromX: number, fromY: number, toX: number, toY: number, solid: (x: number, y: number) => boolean): { vx: number; vy: number } {
  const fx = Math.floor(fromX);
  const fy = Math.floor(fromY);
  const tx = Math.floor(toX);
  const ty = Math.floor(toY);
  const xWall = tx !== fx && solid(tx, fy);
  const yWall = ty !== fy && solid(fx, ty);
  if (xWall && !yWall) return { vx: -vx, vy };
  if (yWall && !xWall) return { vx, vy: -vy };
  return { vx: -vx, vy: -vy };
}
