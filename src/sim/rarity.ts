/**
 * Weapon rarity and modifiers (P3, Terraria-style prefixes). Every owned weapon can carry one prefix;
 * the Workshop reforges a weapon for a visible price and the odds are printed on the button (no hidden
 * rolls, no real money). The roll is a hash of the world seed, the weapon and a reforge counter, so a
 * reload does not re-roll it. Pure data plus stat folding.
 */
import type { GearId, GearSlot, GearStats } from './gear';
import { hash2 } from './rng';
import type { Inventory } from './tiles';

export type Rarity = 'common' | 'rare' | 'epic';
export type WeaponSlot = Extract<GearSlot, 'melee' | 'ranged'>;

export const RARITY: Record<Rarity, { name: string; color: string; weight: number }> = {
  common: { name: 'Common', color: '#e8ecf4', weight: 60 },
  rare: { name: 'Rare', color: '#4aa8ff', weight: 30 },
  epic: { name: 'Epic', color: '#c070ff', weight: 10 },
};
export const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic'];

export type PrefixId =
  | 'sharp'
  | 'swift'
  | 'long'
  | 'brutal'
  | 'lightning'
  | 'vampiric'
  | 'godly'
  | 'heavy'
  | 'rapid'
  | 'charged'
  | 'bouncy'
  | 'overclocked'
  | 'piercing';

export interface PrefixDef {
  name: string;
  slot: WeaponSlot;
  rarity: Rarity;
  desc: string;
  /** Damage and cooldown multipliers, flat reach, extra heal per hit, extra wall bounces, pierce. */
  dmg?: number;
  cd?: number;
  reach?: number;
  leech?: number;
  bounces?: number;
  pierce?: boolean;
}

export const PREFIXES: Record<PrefixId, PrefixDef> = {
  sharp: { name: 'Sharp', slot: 'melee', rarity: 'common', desc: '+15% damage', dmg: 1.15 },
  swift: { name: 'Swift', slot: 'melee', rarity: 'common', desc: 'Swings 15% faster', cd: 0.85 },
  long: { name: 'Long', slot: 'melee', rarity: 'common', desc: '+0.5 reach', reach: 0.5 },
  brutal: { name: 'Brutal', slot: 'melee', rarity: 'rare', desc: '+30% damage', dmg: 1.3 },
  lightning: { name: 'Lightning', slot: 'melee', rarity: 'rare', desc: '+10% damage, swings 25% faster', dmg: 1.1, cd: 0.75 },
  vampiric: { name: 'Vampiric', slot: 'melee', rarity: 'epic', desc: '+15% damage, hits heal 2 HP', dmg: 1.15, leech: 2 },
  godly: { name: 'Godly', slot: 'melee', rarity: 'epic', desc: '+25% damage, 15% faster, +0.4 reach', dmg: 1.25, cd: 0.85, reach: 0.4 },
  heavy: { name: 'Heavy', slot: 'ranged', rarity: 'common', desc: '+15% damage', dmg: 1.15 },
  rapid: { name: 'Rapid', slot: 'ranged', rarity: 'common', desc: 'Fires 15% faster', cd: 0.85 },
  charged: { name: 'Charged', slot: 'ranged', rarity: 'rare', desc: '+30% damage', dmg: 1.3 },
  bouncy: { name: 'Bouncy', slot: 'ranged', rarity: 'rare', desc: '+10% damage, bolts bounce once', dmg: 1.1, bounces: 1 },
  overclocked: { name: 'Overclocked', slot: 'ranged', rarity: 'epic', desc: '+25% damage, fires 20% faster', dmg: 1.25, cd: 0.8 },
  piercing: { name: 'Piercing', slot: 'ranged', rarity: 'epic', desc: '+15% damage, bolts pierce', dmg: 1.15, pierce: true },
};
export const PREFIX_IDS = Object.keys(PREFIXES) as PrefixId[];

/** Visible reforge price per weapon slot (paid from the stash at the Workshop). */
export const REFORGE_COST: Record<WeaponSlot, Inventory> = {
  melee: { crystal: 3, iron_scrap: 6 },
  ranged: { crystal: 3, copper_wire: 6 },
};

/** "60% common / 30% rare / 10% epic", printed next to the REFORGE button. */
export function oddsText(): string {
  const tot = RARITIES.reduce((a, r) => a + RARITY[r].weight, 0);
  return RARITIES.map((r) => `${Math.round((RARITY[r].weight / tot) * 100)}% ${RARITY[r].name.toLowerCase()}`).join(' / ');
}

/** Rarity of an owned weapon: no prefix is plain common. */
export function rarityOf(p: PrefixId | undefined): Rarity {
  return p ? PREFIXES[p].rarity : 'common';
}

/** "Brutal Plasma axe" or the plain name. */
export function prefixedName(name: string, p: PrefixId | undefined): string {
  return p ? `${PREFIXES[p].name} ${name}` : name;
}

/**
 * Roll a prefix for a weapon slot from a [0,1) pick for the rarity and one for the prefix; never
 * returns `avoid` (a reforge always changes something) when another prefix is possible. Pure.
 */
export function pickPrefix(slot: WeaponSlot, r1: number, r2: number, avoid?: PrefixId): PrefixId {
  const tot = RARITIES.reduce((a, r) => a + RARITY[r].weight, 0);
  let acc = 0;
  let rar: Rarity = 'common';
  for (const r of RARITIES) {
    acc += RARITY[r].weight / tot;
    if (r1 < acc) {
      rar = r;
      break;
    }
  }
  let pool = PREFIX_IDS.filter((p) => PREFIXES[p].slot === slot && PREFIXES[p].rarity === rar && p !== avoid);
  if (!pool.length) pool = PREFIX_IDS.filter((p) => PREFIXES[p].slot === slot && p !== avoid);
  return pool[Math.min(pool.length - 1, Math.floor(r2 * pool.length))];
}

/** Deterministic reforge roll: world seed, weapon and how many reforges were done before. */
export function rollReforge(slot: WeaponSlot, id: GearId, count: number, seed: number, avoid?: PrefixId): PrefixId {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return pickPrefix(slot, hash2(count, h, seed ^ 0x7e1f), hash2(count, h, seed ^ 0x3a9c), avoid);
}

/** Fold the prefixes of the equipped weapons into a stat block (returns a new block). Pure. */
export function applyPrefixes(s: GearStats, melee: PrefixId | undefined, ranged: PrefixId | undefined): GearStats {
  const o: GearStats = { ...s };
  if (melee && PREFIXES[melee]?.slot === 'melee') {
    const p = PREFIXES[melee];
    if (p.dmg) o.meleeDmg = Math.round(o.meleeDmg * p.dmg);
    if (p.cd) o.meleeCd *= p.cd;
    if (p.reach) o.meleeRange += p.reach;
    if (p.leech) o.leech += p.leech;
  }
  if (ranged && PREFIXES[ranged]?.slot === 'ranged') {
    const p = PREFIXES[ranged];
    if (p.dmg) o.rangedDmg = Math.round(o.rangedDmg * p.dmg);
    if (p.cd) o.rangedCd *= p.cd;
    if (p.bounces) o.bounces += p.bounces;
    if (p.pierce) o.pierce = true;
  }
  return o;
}

/** Never throws: keeps only known prefixes on owned weapons of the matching slot. */
export function sanitizePrefixes(v: unknown, owned: readonly GearId[], slotOf: (id: GearId) => GearSlot): Partial<Record<GearId, PrefixId>> {
  const out: Partial<Record<GearId, PrefixId>> = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  for (const [k, p] of Object.entries(v as Record<string, unknown>)) {
    const id = k as GearId;
    if (!owned.includes(id) || typeof p !== 'string' || !(p in PREFIXES)) continue;
    if (PREFIXES[p as PrefixId].slot !== slotOf(id)) continue;
    out[id] = p as PrefixId;
  }
  return out;
}
