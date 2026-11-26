/**
 * Robot quest lines (P12-E, STORY.md): three short deliveries per base robot, each telling a little of
 * what that robot remembers. Goods come from the stash and so do rewards; every price and reward is
 * shown up front. No timers, no random rolls, nothing is lost by waiting. Pure.
 */
import type { NpcKind } from './npcs';
import { canAfford, invAdd, pay, type Inventory, type ItemId } from './tiles';

/** Robots with a quest line (the visiting merchant has none). */
export type QuestNpc = Exclude<NpcKind, 'merchant'>;
export const QUEST_NPCS: readonly QuestNpc[] = ['trader', 'medic', 'gunsmith', 'scientist'];

export interface Quest {
  title: string;
  need: Inventory;
  reward: Inventory;
  /** One line each (story bible: two lines per delivery at most). */
  ask: string;
  done: string;
}

export const QUESTS: Record<QuestNpc, readonly [Quest, Quest, Quest]> = {
  trader: [
    { title: 'Open for business', need: { iron_scrap: 12 }, reward: { copper_wire: 4 }, ask: 'A counter needs bracing. Scrap will do.', done: 'First sale in a very long time. Feels right.' },
    { title: 'The old ledger', need: { copper_wire: 10 }, reward: { crystal: 5 }, ask: 'My ledger core needs rewiring.', done: 'Same freight, same date, every entry. For centuries.' },
    { title: 'Last delivery', need: { crystal: 8, metal: 16 }, reward: { circuit: 4 }, ask: 'One crate never shipped. Help me seal it.', done: 'It was seeds. Someone meant to start over.' },
  ],
  medic: [
    { title: 'Clean bandages', need: { biomass: 10 }, reward: { medkit: 2 }, ask: 'Bring plant fibre. I will make you field kits.', done: 'My last patient wore a suit like yours.' },
    { title: 'Broth', need: { fish: 3, biomass: 6 }, reward: { medkit: 3 }, ask: 'My culture tanks need feeding.', done: 'The tanks remember a recipe. I do not remember who for.' },
    { title: 'Night light', need: { glowfish: 2, crystal: 6 }, reward: { medkit: 5 }, ask: 'The ward lamp is dark. Something that glows?', done: 'The patients left. I kept the light on anyway.' },
  ],
  gunsmith: [
    { title: 'Warm the forge', need: { metal: 20 }, reward: { iron_scrap: 15 }, ask: 'Cold forge, bad shots. Feed it plate.', done: 'I built the grid that guards this place.' },
    { title: 'Rewire the sights', need: { copper_wire: 12, iron_scrap: 20 }, reward: { crystal: 8 }, ask: 'Targeting rig is blind. Wire and scrap.', done: 'The grid stopped asking who it was aiming at.' },
    { title: 'Stand down code', need: { circuit: 6 }, reward: { crystal: 12, metal: 20 }, ask: 'Gold circuits. I need to write something careful.', done: 'It is a stand-down order. Nobody is left to sign it.' },
  ],
  scientist: [
    { title: 'First sample', need: { crystal: 8 }, reward: { copper_wire: 10 }, ask: 'Crystals record vibration. Bring me some.', done: 'They hum the same minute, over and over.' },
    { title: 'Timestamp', need: { circuit: 8 }, reward: { crystal: 12 }, ask: 'Circuit logs can date that minute.', done: 'It is the minute the Hollow began to restore the world.' },
    { title: 'The loop', need: { plasma: 6 }, reward: { circuit: 8 }, ask: 'I can model the loop, given enough power.', done: 'It cannot finish. It is waiting for a person to say stop.' },
  ],
};

/** Quests finished per robot (saved). */
export type QuestLog = Partial<Record<QuestNpc, number>>;

export function isQuestNpc(v: unknown): v is QuestNpc {
  return typeof v === 'string' && (QUEST_NPCS as readonly string[]).includes(v);
}

export function questsDone(log: QuestLog, npc: QuestNpc): number {
  return log[npc] ?? 0;
}

/** The robot's open quest, or null once its line is finished. */
export function activeQuest(log: QuestLog, npc: QuestNpc): Quest | null {
  return QUESTS[npc][questsDone(log, npc)] ?? null;
}

/** Hand in the open quest from the stash. False (and nothing changes) when the line is done or goods are missing. */
export function deliverQuest(log: QuestLog, npc: QuestNpc, stash: Inventory): Quest | null {
  const q = activeQuest(log, npc);
  if (!q || !canAfford(stash, q.need)) return null;
  pay(stash, q.need);
  for (const k of Object.keys(q.reward) as ItemId[]) invAdd(stash, k, q.reward[k] ?? 0);
  log[npc] = questsDone(log, npc) + 1;
  return q;
}

export function sanitizeQuests(v: unknown): QuestLog {
  const out: QuestLog = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  const rec = v as Record<string, unknown>;
  for (const npc of QUEST_NPCS) {
    const n = rec[npc];
    if (typeof n === 'number' && Number.isFinite(n) && n >= 1) out[npc] = Math.min(QUESTS[npc].length, Math.floor(n));
  }
  return out;
}
