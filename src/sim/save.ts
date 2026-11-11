import { ITEM_IDS, type Inventory } from './tiles';
import { legacyWalls, sanitizeBase, sanitizeWalls, type BaseTiles } from './base';
import { UPGRADES, type Levels } from './upgrades';
import { CODEX_IDS } from './explore';
import { defaultGear, sanitizeGear, type GearSave } from './gear';
import { BOSS_IDS, type BossId } from './bosses';
import { sanitizeDiff, type WorldDiff } from './persist';

export const SAVE_VERSION = 11;
/** Keep saves well under the ~5 MB localStorage quota: past this, the world diff is dropped (progress is kept). */
export const SAVE_SOFT_LIMIT = 2_500_000;
const MAX_COUNT = 1_000_000_000;

export interface SaveData {
  v: number;
  seedBase: number;
  runs: number;
  stash: Inventory;
  /** Loot carried when the game was last saved; banked on load so a refresh or crash never loses a dive. */
  carried: Inventory;
  upgrades: Levels;
  stats: { deepest: number; deaths: number; playTime: number; banked: number };
  /** v11 adds music (background music on/off, default on). */
  settings: { muted: boolean; music: boolean };
  /** v2: persistent base tiles above the landing pad (see base.ts). */
  base: BaseTiles;
  /** v3: player-built back walls in the base strip (wall-layer ids). */
  walls: BaseTiles;
  /** v4: codex entries discovered (biomes, points of interest); each pays a one-time reward. */
  codex: string[];
  /** v5: the current world persists until death: edits since generation and the explored map (persist.ts). */
  world: WorldDiff | null;
  /** v6: when the game was last saved (ms epoch, 0 = unknown), the day clock and battery charge then; drives offline production. */
  away: { savedAt: number; time: number; charge: number };
  /** v7: world seed chosen from a shared code (null = derived from seedBase and runs). */
  worldSeed: number | null;
  /** v9: crafted gear (owned forever) and what is equipped per slot. */
  gear: GearSave;
  /** v10: bosses defeated (first win grants their trophy gear). */
  bosses: BossId[];
}

export function defaultSave(seedBase = 1337): SaveData {
  return {
    v: SAVE_VERSION,
    seedBase,
    runs: 0,
    stash: {},
    carried: {},
    upgrades: {},
    stats: { deepest: 0, deaths: 0, playTime: 0, banked: 0 },
    settings: { muted: false, music: true },
    base: [],
    walls: [],
    codex: [],
    world: null,
    away: { savedAt: 0, time: 0, charge: 0 },
    worldSeed: null,
    gear: defaultGear(),
    bosses: [],
  };
}

function num(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function inv(v: unknown): Inventory {
  const out: Inventory = {};
  if (!v || typeof v !== 'object') return out;
  const rec = v as Record<string, unknown>;
  for (const id of ITEM_IDS) {
    const n = Math.floor(num(rec[id], 0, MAX_COUNT, 0));
    if (n > 0) out[id] = n;
  }
  return out;
}

/** Never throws. Corrupt, tampered or old data degrades to safe values instead of crashing the game. */
export function parseSave(raw: string | null | undefined): SaveData {
  const base = defaultSave();
  if (!raw) return base;
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return base;
  }
  if (!o || typeof o !== 'object') return base;
  const r = o as Record<string, unknown>;
  // Future versions: keep what we understand, never crash. Older versions: migrate here when v2 exists.
  const levels: Levels = {};
  const up = (r.upgrades && typeof r.upgrades === 'object' ? r.upgrades : {}) as Record<string, unknown>;
  for (const def of UPGRADES) {
    const lv = Math.floor(num(up[def.id], 0, def.maxLevel, 0));
    if (lv > 0) levels[def.id] = lv;
  }
  const st = (r.stats && typeof r.stats === 'object' ? r.stats : {}) as Record<string, unknown>;
  const se = (r.settings && typeof r.settings === 'object' ? r.settings : {}) as Record<string, unknown>;
  return {
    v: SAVE_VERSION,
    seedBase: Math.floor(num(r.seedBase, 0, 4294967295, base.seedBase)),
    runs: Math.floor(num(r.runs, 0, MAX_COUNT, 0)),
    stash: inv(r.stash),
    carried: inv(r.carried),
    upgrades: levels,
    stats: {
      deepest: Math.floor(num(st.deepest, 0, 100000, 0)),
      deaths: Math.floor(num(st.deaths, 0, MAX_COUNT, 0)),
      playTime: num(st.playTime, 0, 1e10, 0),
      banked: Math.floor(num(st.banked, 0, MAX_COUNT, 0)),
    },
    // v10 -> v11: music defaults to on.
    settings: { muted: se.muted === true, music: se.music !== false },
    // v1 saves have no base field: sanitizeBase(undefined) yields an empty base (migration v1 -> v2).
    base: sanitizeBase(r.base),
    // v2 -> v3: back walls moved from base tiles to their own layer.
    walls: typeof r.v === 'number' && r.v >= 3 ? sanitizeWalls(r.walls) : legacyWalls(r.base),
    // v3 -> v4: no codex yet (empty); unknown or duplicate ids are dropped.
    codex: sanitizeCodex(r.codex),
    // v4 -> v5: no stored world; the game regenerates the current seed fresh.
    world: sanitizeDiff(r.world),
    // v5 -> v6: no away stamp (savedAt 0), so nothing is simulated offline.
    away: sanitizeAway(r.away),
    // v6 -> v7: no shared seed; the world derives from seedBase and runs as before.
    worldSeed: typeof r.worldSeed === 'number' && Number.isFinite(r.worldSeed) ? Math.floor(num(r.worldSeed, 0, 4294967295, 0)) : null,
    // v8 -> v9: only the starter blade and pistol.
    gear: sanitizeGear(r.gear),
    // v9 -> v10: no bosses beaten yet.
    bosses: Array.isArray(r.bosses) ? BOSS_IDS.filter((id) => (r.bosses as unknown[]).includes(id)) : [],
  };
}

function sanitizeAway(v: unknown): SaveData['away'] {
  const a = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return { savedAt: Math.floor(num(a.savedAt, 0, 4e12, 0)), time: num(a.time, 0, 1e9, 0), charge: num(a.charge, 0, 1e6, 0) };
}

function sanitizeCodex(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const id of v) if (typeof id === 'string' && CODEX_IDS.has(id) && !out.includes(id)) out.push(id);
  return out;
}

export function serializeSave(s: SaveData): string {
  const full = JSON.stringify(s);
  if (full.length <= SAVE_SOFT_LIMIT) return full;
  return JSON.stringify({ ...s, world: null });
}
