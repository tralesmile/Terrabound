/**
 * The tracked goal: pin one recipe or robot quest and the HUD shows what is still missing and where
 * the first missing material comes from. One pin, saved. Pure.
 */
import { NPC_INFO } from './npcs';
import { activeQuest, isQuestNpc, type QuestLog } from './quests';
import { recipeById } from './recipes';
import { sourceHint } from './sources';
import { ITEMS, ITEM_IDS, type Inventory, type ItemId } from './tiles';

/** "r:<recipe id>" or "q:<robot>". */
export type PinId = string;

export interface TrackRow {
  item: ItemId;
  have: number;
  need: number;
}

export interface Tracker {
  pin: PinId;
  title: string;
  rows: TrackRow[];
  ready: boolean;
  /** One line: where to get the first missing material, or what to do when nothing is missing. */
  hint: string;
}

function target(pin: PinId, log: QuestLog): { title: string; need: Inventory; act: string } | null {
  const key = pin.slice(2);
  if (pin.startsWith('r:')) {
    const r = recipeById(key);
    return r ? { title: r.name.split(' (')[0], need: r.cost, act: 'craft it at the pad' } : null;
  }
  if (pin.startsWith('q:') && isQuestNpc(key)) {
    const q = activeQuest(log, key);
    const name = NPC_INFO[key].name;
    return q ? { title: `${name}: ${q.title}`, need: q.need, act: `hand it to ${name} (workshop QUESTS)` } : null;
  }
  return null;
}

/** True when the pin names a real recipe or an unfinished quest line. */
export function validPin(pin: unknown, log: QuestLog): pin is PinId {
  return typeof pin === 'string' && target(pin, log) !== null;
}

/** Materials count what is banked plus what is in the pack and will bank (kit stays in the pack). */
export function trackerFor(pin: PinId | null, log: QuestLog, stash: Inventory, carried: Inventory): Tracker | null {
  const t = pin ? target(pin, log) : null;
  if (!pin || !t) return null;
  const rows: TrackRow[] = [];
  for (const item of ITEM_IDS) {
    const need = t.need[item] ?? 0;
    if (need <= 0) continue;
    const have = (stash[item] ?? 0) + (ITEMS[item].kit ? 0 : (carried[item] ?? 0));
    rows.push({ item, have: Math.min(have, need), need });
  }
  const missing = rows.find((r) => r.have < r.need);
  const banked = rows.every((r) => (stash[r.item] ?? 0) >= r.need);
  const hint = missing ? `${ITEMS[missing.item].name}: ${sourceHint(missing.item)}` : banked ? `Ready: ${t.act}` : 'You have it all: bank it at the pad';
  return { pin, title: t.title, rows, ready: !missing && banked, hint };
}
