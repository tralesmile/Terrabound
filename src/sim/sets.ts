/**
 * Armor sets (Terraria-style set bonuses): wearing 2 or 3 pieces of a theme adds a bonus on top of the
 * pieces' own stats, so collecting a look pays off. Pure data plus helpers; no save field (the bonus is
 * derived from what is equipped).
 */
import type { GearId, GearStats, Loadout } from './gear';

export type SetId = 'pathfinder' | 'deep_miner' | 'vanguard' | 'hollow';

/** Stats a set tier can add (all additive or multiplicative, so tiers stack). */
export type SetMod = Partial<Pick<GearStats, 'armor' | 'digMul' | 'light' | 'maxHp' | 'drainMul' | 'airJumps'>>;

export interface SetTier {
  /** Pieces needed. */
  n: number;
  mod: SetMod;
  desc: string;
}

export interface SetDef {
  name: string;
  pieces: GearId[];
  tiers: SetTier[];
  color: string;
}

export const SETS: Record<SetId, SetDef> = {
  pathfinder: {
    name: 'Pathfinder',
    pieces: ['scout_helm', 'spring_boots', 'glider'],
    tiers: [
      { n: 2, mod: { drainMul: 0.9, light: 1 }, desc: '+1 light, battery lasts 10% longer' },
      { n: 3, mod: { airJumps: 1 }, desc: 'one more jump in the air' },
    ],
    color: '#7dffb0',
  },
  deep_miner: {
    name: 'Deep Miner',
    pieces: ['miner_helm', 'reactor_suit', 'jetpack'],
    tiers: [
      { n: 2, mod: { digMul: 1.2 }, desc: '+20% dig speed' },
      { n: 3, mod: { drainMul: 0.85, light: 1 }, desc: 'battery lasts 15% longer, +1 light' },
    ],
    color: '#ffcf4a',
  },
  vanguard: {
    name: 'Vanguard',
    pieces: ['plate_vest', 'dash_boots'],
    tiers: [{ n: 2, mod: { armor: 0.1, maxHp: 15 }, desc: '10% armor, +15 health' }],
    color: '#ff5a5a',
  },
  hollow: {
    name: 'Hollow Regalia',
    pieces: ['ai_crown', 'frost_core'],
    tiers: [{ n: 2, mod: { armor: 0.1, maxHp: 30 }, desc: '10% armor, +30 health' }],
    color: '#ff5aff',
  },
};

export const SET_IDS = Object.keys(SETS) as SetId[];

/** The set a piece belongs to (each piece is in at most one set). */
export function setOf(id: GearId): SetId | null {
  for (const s of SET_IDS) if (SETS[s].pieces.includes(id)) return s;
  return null;
}

export interface SetState {
  id: SetId;
  worn: number;
  /** Tiers whose piece count is met, lowest first. */
  active: SetTier[];
}

/** How many pieces of each set are equipped and which tiers are on (sets with no piece worn are left out). */
export function setStates(equip: Loadout): SetState[] {
  const worn = new Set(Object.values(equip));
  const out: SetState[] = [];
  for (const id of SET_IDS) {
    const n = SETS[id].pieces.filter((p) => worn.has(p)).length;
    if (n > 0) out.push({ id, worn: n, active: SETS[id].tiers.filter((t) => n >= t.n) });
  }
  return out;
}

/** Every active tier's stat bonus, in a fixed order. */
export function setMods(equip: Loadout): SetMod[] {
  return setStates(equip).flatMap((s) => s.active.map((t) => t.mod));
}

/** Active tier count per set, as a key like "pathfinder:2"; used to spot a tier switching on. */
export function activeTierKeys(equip: Loadout): string[] {
  return setStates(equip).flatMap((s) => s.active.map((t) => `${s.id}:${t.n}`));
}

/** One line for a tooltip or the inventory: "Pathfinder 2/3: +1 light, ...". */
export function setLine(id: SetId, worn: number): string {
  const d = SETS[id];
  const on = d.tiers.filter((t) => worn >= t.n).map((t) => t.desc);
  const next = d.tiers.find((t) => worn < t.n);
  const tail = on.length ? on.join('; ') : next ? `${next.n} pieces: ${next.desc}` : '';
  return `${d.name} ${worn}/${d.pieces.length}: ${tail}`;
}
