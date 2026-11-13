/**
 * Codex screen data: places (biomes + points of interest), creatures (enemies + bosses) and data logs.
 * Pure. Knowledge is derived from what the save already holds: `save.codex` for places, `save.bosses`
 * for bosses, and award counters for per-kind kills (`kill:<kind>`) and logs read (`seen:lore:<i>`),
 * so no save field is added (the award counters are sanitised generically).
 */
import type { Awards } from './achievements';
import { BOSSES, BOSS_IDS } from './bosses';
import { ENEMIES, type EnemyKind } from './enemies';
import { CODEX, LORE } from './explore';
import type { GameEvent } from './game';
import { NPC_INFO, NPC_ORDER, type NpcKind } from './npcs';

export type CodexSection = 'places' | 'crew' | 'creatures' | 'logs';

export interface CodexRow {
  section: CodexSection;
  id: string;
  /** Shown name, or '???' while unknown. */
  title: string;
  /** One line of detail: a hint while unknown, facts once known. */
  detail: string;
  found: boolean;
}

/** Field notes per creature: one line, shown once you have destroyed one. */
const CREATURE_NOTES: Record<EnemyKind, string> = {
  crawler: 'Scuttles along tunnel floors in packs. Blade it before it closes in.',
  flyer: 'A stray survey drone gone feral. Fragile, but it dives at your lamp.',
  vine: 'Overgrown Ruins only. A cable vine that learned to hunt. Drops biomass.',
  mite: 'Crystal Flats only. Hops between shards and sheds crystal when broken.',
  ember: 'Ash Dunes only. A drifting coal that bites. Leaves copper wire behind.',
  hulk: 'Frozen Spires only. Slow and armoured. Keep your distance and shoot.',
};

const BOSS_NOTES: Record<string, string> = {
  colossus: 'Rust Wastes. Watch for the slam shadow, then dodge the scrap rain.',
  vine_queen: 'Overgrown Ruins. Calls vines to her side; clear them, then strike.',
  golem: 'Crystal Flats. Its prism volley telegraphs with a glow. Move, then hit.',
  wyrm: 'Ash Dunes. Burrows and charges. Stay off the sand when it dives.',
  titan: 'Frozen Spires. Huge reach and frost minions. Patience wins this one.',
  hollow_ai: 'The Core. The mind under the planet. Beat it to end the Hollow.',
};

/** Crew entries: robots in move-in order, then the merchant drone. */
export const CREW_KINDS: readonly NpcKind[] = [...NPC_ORDER, 'merchant'];

const CREW_NOTES: Record<NpcKind, string> = {
  trader: 'Barters at posted rates from base storage. A cozy room adds a bonus rate.',
  medic: 'Sells medkits. While Patch lives here you keep 3/4 of your pack on a fall.',
  gunsmith: 'Builds mod chips, one per weapon slot. Swapping is free at the base.',
  scientist: 'Studies permanent perks: battery, dig speed, pack, lamp, HP and speed.',
  merchant: 'Hovers over the pad from sunrise to mid-afternoon with 3 fresh offers.',
};

const CREW_HINTS: Record<NpcKind, string> = {
  trader: 'Build a closed room with a light, a table and a bed.',
  medic: 'Build a second home room next to the first.',
  gunsmith: 'A third home room brings a weapons expert.',
  scientist: 'A fourth home room draws a researcher.',
  merchant: 'Watch the sky over the pad in the morning.',
};

/** Award-counter key that marks a crew member as met. */
export function crewKey(kind: NpcKind): string {
  return `seen:npc:${kind}`;
}

export const ENEMY_KINDS = Object.keys(ENEMIES) as EnemyKind[];

/** Award-counter key for kills of one enemy kind. */
export function killKey(kind: EnemyKind): string {
  return `kill:${kind}`;
}

/** Award-counter key that marks log `i` as read. */
export function loreKey(i: number): string {
  return `seen:lore:${i}`;
}

/** Codex knowledge from an event (folded into the award counters next to countEvent). */
export function noteCodexEvent(aw: Awards, e: GameEvent): void {
  if (e.t === 'enemykill') {
    const k = killKey(e.kind);
    aw.n[k] = Math.min(1e9, (aw.n[k] ?? 0) + 1);
  } else if ((e.t === 'merchant' && e.here) || (e.t === 'npctalk' && e.kind === 'merchant')) {
    aw.n[crewKey('merchant')] = 1;
  } else if (e.t === 'lore') {
    const i = LORE.indexOf(e.text);
    if (i >= 0) aw.n[loreKey(i)] = 1;
  }
}

export interface CodexKnowledge {
  codex: readonly string[];
  bosses: readonly string[];
  awards: Readonly<Awards>;
  /** Crew present right now (robots living here, the merchant if parked); counts as met. */
  present?: readonly NpcKind[];
}

/** Every row of the codex screen in display order: places, crew, creatures, logs. */
export function codexRows(k: CodexKnowledge): CodexRow[] {
  const rows: CodexRow[] = [];
  for (const c of CODEX) {
    const found = k.codex.includes(c.id);
    const reward = Object.entries(c.reward).map(([id, n]) => `${n} ${id.replace(/_/g, ' ')}`).join(', ');
    const hint = c.id.startsWith('biome:') ? 'An unexplored biome. Walk the surface to find it.' : 'Somewhere out there. Explore to find it.';
    rows.push({ section: 'places', id: c.id, title: found ? c.name : '???', detail: found ? (c.note ? `${c.note} Paid ${reward}.` : `Found. Paid ${reward}.`) : hint, found });
  }
  for (const kind of CREW_KINDS) {
    const here = k.present?.includes(kind) ?? false;
    const found = here || (k.awards.n[crewKey(kind)] ?? 0) > 0;
    const info = NPC_INFO[kind];
    rows.push({
      section: 'crew',
      id: `crew:${kind}`,
      title: found ? `${info.name} the ${info.title}${here && kind !== 'merchant' ? '  (home)' : ''}` : `??? (${info.title.toLowerCase()})`,
      detail: found ? CREW_NOTES[kind] : CREW_HINTS[kind],
      found,
    });
  }
  for (const kind of ENEMY_KINDS) {
    const n = k.awards.n[killKey(kind)] ?? 0;
    const found = n > 0;
    rows.push({
      section: 'creatures',
      id: `enemy:${kind}`,
      title: found ? `${ENEMIES[kind].name}  x${n.toLocaleString('en-US')}` : '???',
      detail: found ? CREATURE_NOTES[kind] : 'Destroy one to learn about it.',
      found,
    });
  }
  for (const id of BOSS_IDS) {
    const found = k.bosses.includes(id);
    rows.push({ section: 'creatures', id: `boss:${id}`, title: found ? `${BOSSES[id].name} (boss)` : '??? (boss)', detail: found ? BOSS_NOTES[id] ?? '' : 'A giant. Craft its summon beacon to face it.', found });
  }
  LORE.forEach((line, i) => {
    const found = (k.awards.n[loreKey(i)] ?? 0) > 0;
    const head = line.slice(0, line.indexOf(':'));
    rows.push({ section: 'logs', id: `lore:${i}`, title: found ? head : `${head} (missing)`, detail: found ? line.slice(line.indexOf(':') + 2) : 'Read data shrine terminals to recover it.', found });
  });
  return rows;
}

/** Found / total per section, for the tab label and the page footer. */
export function codexCounts(rows: readonly CodexRow[]): { found: number; total: number } {
  return { found: rows.filter((r) => r.found).length, total: rows.length };
}

/** Story order of the log reader: indices into LORE of the logs read so far. */
export function readLogs(aw: Readonly<Awards>): number[] {
  return LORE.map((_, i) => i).filter((i) => (aw.n[loreKey(i)] ?? 0) > 0);
}

/** Next read log after `i` in story order (`d` = +1 / -1), or null at either end. */
export function stepLog(aw: Readonly<Awards>, i: number, d: 1 | -1): number | null {
  const read = readLogs(aw);
  const next = d > 0 ? read.find((j) => j > i) : [...read].reverse().find((j) => j < i);
  return next ?? null;
}

/** Full log text without its "LOG nn:" head, and the head. */
export function logParts(i: number): { head: string; body: string } {
  const line = LORE[i] ?? '';
  const c = line.indexOf(':');
  return c < 0 ? { head: line, body: '' } : { head: line.slice(0, c), body: line.slice(c + 2) };
}
