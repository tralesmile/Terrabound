/**
 * Research (P1.8 Characters: the Scientist). Nova the Scientist moves into the fourth valid room and
 * studies materials into small permanent perks. Every perk has a fixed, visible cost and some need
 * an earlier perk first, so it reads as a short tree. Perks are owned forever (they survive death
 * and new worlds, like upgrades). Pure data plus the stat folding.
 */
import type { Derived } from './upgrades';
import type { Inventory } from './tiles';

export type ResearchId = 'cell_density' | 'tungsten_bits' | 'compression' | 'photonics' | 'nano_weave' | 'servo_legs' | 'core_theory';

export interface ResearchDef {
  name: string;
  desc: string;
  cost: Inventory;
  /** Perks that must be researched first. */
  needs: readonly ResearchId[];
  /** Icon colour. */
  color: string;
}

export const RESEARCH: Record<ResearchId, ResearchDef> = {
  cell_density: { name: 'Cell density', desc: '+40 max battery', cost: { metal: 6, crystal: 2 }, needs: [], color: '#36e0e8' },
  tungsten_bits: { name: 'Tungsten bits', desc: 'Drill digs 15% faster', cost: { iron_scrap: 12, metal: 4 }, needs: [], color: '#ff9a3c' },
  compression: { name: 'Pack compression', desc: '+8 pack space', cost: { copper_wire: 8, biomass: 10 }, needs: [], color: '#ffd23a' },
  photonics: { name: 'Photonics', desc: 'Suit lamp reaches 1 tile further', cost: { crystal: 3, copper_wire: 4 }, needs: [], color: '#fff3a0' },
  nano_weave: { name: 'Nano weave', desc: '+15 max HP', cost: { crystal: 4, biomass: 6 }, needs: ['cell_density'], color: '#ff7ab8' },
  servo_legs: { name: 'Servo legs', desc: 'Run 7% faster', cost: { circuit: 1, metal: 4 }, needs: ['tungsten_bits'], color: '#7dffb0' },
  core_theory: { name: 'Core theory', desc: '+60 max battery', cost: { plasma: 2, circuit: 2 }, needs: ['cell_density', 'photonics'], color: '#c08aff' },
};

export const RESEARCH_IDS = Object.keys(RESEARCH) as ResearchId[];

/** Never throws: unknown and duplicate ids dropped, and a perk whose prerequisites are missing is dropped too. */
export function sanitizeResearch(v: unknown): ResearchId[] {
  if (!Array.isArray(v)) return [];
  const raw = new Set<ResearchId>();
  for (const id of v) if (typeof id === 'string' && id in RESEARCH) raw.add(id as ResearchId);
  // Keep only perks reachable through their prerequisites, in table order (prerequisites come first).
  const out: ResearchId[] = [];
  for (const id of RESEARCH_IDS) if (raw.has(id) && RESEARCH[id].needs.every((n) => out.includes(n))) out.push(id);
  return out;
}

/** Prerequisites still missing for `id` (empty when it can be studied). Pure. */
export function researchMissing(done: readonly ResearchId[], id: ResearchId): ResearchId[] {
  return RESEARCH[id].needs.filter((n) => !done.includes(n));
}

/** Fold researched perks into the derived stats (returns a new block). Pure. */
export function applyResearch(d: Derived, done: readonly ResearchId[]): Derived {
  const o: Derived = { ...d };
  const has = (id: ResearchId): boolean => done.includes(id);
  if (has('cell_density')) o.maxBattery += 40;
  if (has('core_theory')) o.maxBattery += 60;
  if (has('tungsten_bits')) o.digPower *= 1.15;
  if (has('compression')) o.packCap += 8;
  if (has('photonics')) o.lampRadius += 1;
  if (has('nano_weave')) o.maxHp += 15;
  if (has('servo_legs')) o.speed *= 1.07;
  return o;
}
