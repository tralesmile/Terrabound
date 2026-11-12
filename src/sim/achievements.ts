/**
 * Achievements (awards): long goals across every system, counted from game events.
 * Pure data + helpers. Progress lives in SaveData.awards (v23): `n` counters, `done` ids in unlock order.
 * No rewards that pressure play: an award is a gold star and a line on the AWARDS page, nothing expires.
 */
import type { GameEvent } from './game';

export type Counter =
  | 'mined' | 'kills' | 'chests' | 'discoveries' | 'bosses' | 'bossKinds' | 'victory' | 'depth'
  | 'fish' | 'harvest' | 'planted' | 'meals' | 'crafted' | 'upgrades' | 'smelted' | 'trades'
  | 'research' | 'robots' | 'raids' | 'records' | 'rides' | 'hooks' | 'dashes' | 'banked'
  | 'deaths' | 'rooms' | 'lore' | 'meteors' | 'mods' | 'trees';

export type Tier = 1 | 2 | 3;

export interface AwardDef {
  id: string;
  name: string;
  /** What to do, shown with the progress. */
  desc: string;
  stat: Counter;
  goal: number;
  /** Bronze, silver, gold: only the star colour changes. */
  tier: Tier;
}

const a = (id: string, name: string, desc: string, stat: Counter, goal: number, tier: Tier = 1): AwardDef => ({ id, name, desc, stat, goal, tier });

/** Ordered roughly from first minute to end game; the AWARDS page lists them in this order. */
export const AWARDS: readonly AwardDef[] = [
  a('dig1', 'Breaking ground', 'Mine 100 blocks', 'mined', 100),
  a('dig2', 'Tunnel rat', 'Mine 1,000 blocks', 'mined', 1000, 2),
  a('dig3', 'Hollow earth', 'Mine 5,000 blocks', 'mined', 5000, 3),
  a('deep1', 'Below the scrap', 'Reach 50 m deep', 'depth', 50),
  a('deep2', 'Circuit diver', 'Reach 150 m deep', 'depth', 150, 2),
  a('deep3', 'Core bound', 'Reach 300 m deep', 'depth', 300, 3),
  a('bank1', 'First haul', 'Bank 100 items at the pad', 'banked', 100),
  a('bank2', 'Hoarder', 'Bank 2,000 items at the pad', 'banked', 2000, 2),
  a('chest1', 'Treasure hunter', 'Open 5 chests', 'chests', 5),
  a('chest2', 'Lockpick', 'Open 30 chests', 'chests', 30, 2),
  a('disc1', 'Explorer', 'Discover 5 codex entries', 'discoveries', 5),
  a('disc2', 'Cartographer', 'Discover 12 codex entries', 'discoveries', 12, 2),
  a('lore1', 'Archivist', 'Read 5 data logs', 'lore', 5),
  a('kill1', 'Scrapper', 'Destroy 10 enemies', 'kills', 10),
  a('kill2', 'Exterminator', 'Destroy 150 enemies', 'kills', 150, 2),
  a('kill3', 'Machine breaker', 'Destroy 600 enemies', 'kills', 600, 3),
  a('boss1', 'Giant slayer', 'Defeat a boss', 'bosses', 1),
  a('boss2', 'Trophy wall', 'Defeat 4 different bosses', 'bossKinds', 4, 2),
  a('win', 'Hollow no more', 'Defeat the Hollow AI', 'victory', 1, 3),
  a('raid1', 'Hold the line', 'Survive a night raid', 'raids', 1),
  a('raid2', 'Fortress', 'Survive 10 night raids', 'raids', 10, 2),
  a('room1', 'Home sweet home', 'Build a room a robot can live in', 'rooms', 1),
  a('robot2', 'Neighbourhood', 'Have 4 different robots move in', 'robots', 4, 2),
  a('trade1', 'Haggler', 'Make 10 trades', 'trades', 10),
  a('sci1', 'Eureka', 'Finish 1 research', 'research', 1),
  a('sci2', 'Grand theory', 'Finish 7 research', 'research', 7, 3),
  a('mod1', 'Tinkerer', 'Buy a weapon mod chip', 'mods', 1),
  a('craft1', 'Maker', 'Craft 10 things', 'crafted', 10),
  a('craft2', 'Fabricator', 'Craft 60 things', 'crafted', 60, 2),
  a('up1', 'Upgraded', 'Buy 5 suit upgrades', 'upgrades', 5),
  a('up2', 'Fully loaded', 'Buy 25 suit upgrades', 'upgrades', 25, 3),
  a('smelt1', 'Foundry', 'Smelt 50 ingots', 'smelted', 50, 2),
  a('farm1', 'Green thumb', 'Plant a crop', 'planted', 1),
  a('farm2', 'Harvest moon', 'Harvest 100 produce', 'harvest', 100, 2),
  a('cook1', 'Chef', 'Eat 10 meals or snacks', 'meals', 10),
  a('fish1', 'Gone fishing', 'Catch a fish', 'fish', 1),
  a('fish2', 'Angler', 'Catch 30 fish', 'fish', 30, 2),
  a('tree1', 'Lumberjack', 'Fell 10 trees', 'trees', 10),
  a('ride1', 'Joyride', 'Ride a vehicle', 'rides', 1),
  a('hook1', 'Swinger', 'Grapple 50 times', 'hooks', 50),
  a('dash1', 'Blink', 'Dash 50 times', 'dashes', 50),
  a('star1', 'Stargazer', 'See a meteor shower', 'meteors', 1),
  a('rec1', 'Personal best', 'Beat your own record on a shared world', 'records', 1),
  a('death1', 'Learning curve', 'Lose a suit and try again', 'deaths', 1),
];

export const AWARD_IDS: readonly string[] = AWARDS.map((d) => d.id);

export interface Awards {
  /** Counters by name; `seen:*` flags dedupe distinct counts (robot kinds, boss kinds). */
  n: Record<string, number>;
  /** Unlocked award ids, oldest first. */
  done: string[];
}

export function newAwards(): Awards {
  return { n: {}, done: [] };
}

function add(aw: Awards, c: Counter, by = 1): void {
  aw.n[c] = (aw.n[c] ?? 0) + by;
}

/** Count `key` once: bumps `c` only the first time `key` is seen. */
function addDistinct(aw: Awards, c: Counter, key: string): void {
  const k = `seen:${key}`;
  if (aw.n[k]) return;
  aw.n[k] = 1;
  add(aw, c);
}

/** Fold one game event into the counters. Events that no award uses are ignored. */
export function countEvent(aw: Awards, e: GameEvent): void {
  switch (e.t) {
    case 'break': add(aw, 'mined'); break;
    case 'enemykill': add(aw, 'kills'); break;
    case 'chest': add(aw, 'chests'); break;
    case 'discover': add(aw, 'discoveries'); break;
    case 'lore': add(aw, 'lore'); break;
    case 'bossdown': add(aw, 'bosses'); addDistinct(aw, 'bossKinds', `boss:${e.id}`); break;
    case 'victory': add(aw, 'victory'); break;
    case 'bank': add(aw, 'banked', Math.max(0, e.total)); break;
    case 'raidclear': add(aw, 'raids'); break;
    case 'roomready': add(aw, 'rooms'); break;
    case 'npcarrive': if (e.kind !== 'merchant') addDistinct(aw, 'robots', `npc:${e.kind}`); break;
    case 'trade': add(aw, 'trades'); break;
    case 'research': add(aw, 'research'); break;
    case 'modbuy': add(aw, 'mods'); break;
    case 'craft': case 'craftgear': add(aw, 'crafted'); break;
    case 'upgrade': add(aw, 'upgrades'); break;
    case 'smelt': add(aw, 'smelted', Math.max(0, e.made)); break;
    case 'plant': add(aw, 'planted'); break;
    case 'harvest': add(aw, 'harvest', Math.max(0, e.n)); break;
    case 'eat': add(aw, 'meals'); break;
    case 'catch': add(aw, 'fish', Math.max(0, e.n)); break;
    case 'fell': add(aw, 'trees'); break;
    case 'mount': add(aw, 'rides'); break;
    case 'hook': add(aw, 'hooks'); break;
    case 'dash': add(aw, 'dashes'); break;
    case 'weather': if (e.kind === 'meteors') add(aw, 'meteors'); break;
    case 'record': add(aw, 'records'); break;
    case 'death': add(aw, 'deaths'); break;
    default: break;
  }
}

/** Raise a high-water counter (depth). */
export function noteMax(aw: Awards, c: Counter, v: number): boolean {
  const f = Math.floor(v);
  if (f <= (aw.n[c] ?? 0)) return false;
  aw.n[c] = f;
  return true;
}

export function awardProgress(aw: Awards, d: AwardDef): number {
  return Math.min(d.goal, aw.n[d.stat] ?? 0);
}

/** Unlock every award whose goal is met; returns the newly unlocked definitions in list order. */
export function checkAwards(aw: Awards): AwardDef[] {
  const out: AwardDef[] = [];
  for (const d of AWARDS) {
    if (aw.done.includes(d.id)) continue;
    if ((aw.n[d.stat] ?? 0) >= d.goal) {
      aw.done.push(d.id);
      out.push(d);
    }
  }
  return out;
}

/** Sanitise untrusted saved awards: finite non-negative integer counters, known unique ids. */
export function sanitizeAwards(v: unknown): Awards {
  const out = newAwards();
  if (!v || typeof v !== 'object') return out;
  const r = v as Record<string, unknown>;
  if (r.n && typeof r.n === 'object') {
    for (const [k, x] of Object.entries(r.n as Record<string, unknown>)) {
      if (k.length > 40 || typeof x !== 'number' || !Number.isFinite(x) || x <= 0) continue;
      out.n[k] = Math.min(1e9, Math.floor(x));
    }
  }
  if (Array.isArray(r.done)) {
    for (const id of r.done) if (typeof id === 'string' && AWARD_IDS.includes(id) && !out.done.includes(id)) out.done.push(id);
  }
  return out;
}

/**
 * v22 -> v23 migration: seed counters from what an older save already proves (deepest, deaths,
 * banked, raids, bosses beaten, codex entries, research). Unlocks happen quietly on load.
 */
export function legacyAwards(raw: Record<string, unknown>): Awards {
  const aw = newAwards();
  const st = (raw.stats && typeof raw.stats === 'object' ? raw.stats : {}) as Record<string, unknown>;
  const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.min(1e9, Math.floor(v)) : 0);
  const set = (c: Counter, v: number): void => {
    if (v > 0) aw.n[c] = v;
  };
  set('depth', n(st.deepest));
  set('deaths', n(st.deaths));
  set('banked', n(st.banked));
  set('raids', n(st.raids));
  const list = (v: unknown): string[] => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length < 40))] : []);
  const bosses = list(raw.bosses);
  set('bosses', bosses.length);
  set('bossKinds', bosses.length);
  for (const b of bosses) aw.n[`seen:boss:${b}`] = 1;
  if (bosses.includes('hollow_ai')) set('victory', 1);
  set('discoveries', list(raw.codex).length);
  set('research', list(raw.research).length);
  return aw;
}
