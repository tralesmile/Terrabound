import { ITEM_IDS, type Inventory } from './tiles';
import { legacyWalls, sanitizeBase, sanitizeWalls, type BaseTiles } from './base';
import { UPGRADES, type Levels } from './upgrades';

export const SAVE_VERSION = 3;
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
  settings: { muted: boolean };
  /** v2: persistent base tiles above the landing pad (see base.ts). */
  base: BaseTiles;
  /** v3: player-built back walls in the base strip (wall-layer ids). */
  walls: BaseTiles;
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
    settings: { muted: false },
    base: [],
    walls: [],
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
    settings: { muted: se.muted === true },
    // v1 saves have no base field: sanitizeBase(undefined) yields an empty base (migration v1 -> v2).
    base: sanitizeBase(r.base),
    // v2 -> v3: back walls moved from base tiles to their own layer.
    walls: typeof r.v === 'number' && r.v >= 3 ? sanitizeWalls(r.walls) : legacyWalls(r.base),
  };
}

export function serializeSave(s: SaveData): string {
  return JSON.stringify(s);
}
