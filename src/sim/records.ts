/**
 * Local world records (leaderboard slice 1): personal bests per shared world code (Daily Dive or a
 * code from a friend). Best attempt depth, best attempt loot banked, fastest first boss kill.
 * An attempt starts when you enter the code and ends when the world is left (death or a new dive).
 * Pure data + helpers; the Leaderboard adapter can upload these later.
 */
import { decodeSeed, encodeSeed } from './seedcode';

function isSeedCode(code: string): boolean {
  const s = decodeSeed(code);
  return s !== null && encodeSeed(s) === code;
}

export interface WorldRecord {
  code: string;
  /** Best depth (m) any attempt reached. */
  deepest: number;
  /** Most items banked in one attempt. */
  loot: number;
  /** Fastest first boss kill in seconds of attempt time (0 = none yet). */
  boss: number;
  /** Attempts started on this code. */
  runs: number;
  /** The live attempt: items banked and seconds played so far. */
  curLoot: number;
  curTime: number;
}

/** Most recently played codes kept. */
export const RECORDS_MAX = 10;

export function newRecord(code: string): WorldRecord {
  return { code, deepest: 0, loot: 0, boss: 0, runs: 0, curLoot: 0, curTime: 0 };
}

/** Start a fresh attempt on `code`: the record moves to the front; the list is trimmed. Returns the record. */
export function startAttempt(list: WorldRecord[], code: string): WorldRecord {
  const i = list.findIndex((r) => r.code === code);
  const rec = i >= 0 ? list.splice(i, 1)[0] : newRecord(code);
  rec.runs += 1;
  rec.curLoot = 0;
  rec.curTime = 0;
  list.unshift(rec);
  list.length = Math.min(list.length, RECORDS_MAX);
  return rec;
}

/** What a record update beat, so the game can cheer: 'deep', 'loot', 'boss' (only when an earlier best existed). */
export type RecordBeat = 'deep' | 'loot' | 'boss';

/** Raise the best depth; returns 'deep' when a previous best (> 0) was just passed. */
export function noteDepth(rec: WorldRecord, depth: number): RecordBeat | null {
  const d = Math.floor(depth);
  if (d <= rec.deepest) return null;
  const had = rec.deepest > 0;
  rec.deepest = d;
  return had ? 'deep' : null;
}

/** Add banked items to the live attempt; returns 'loot' when it just passed an earlier best. */
export function noteLoot(rec: WorldRecord, n: number): RecordBeat | null {
  if (!(n > 0)) return null;
  const before = rec.curLoot;
  rec.curLoot += Math.floor(n);
  if (rec.curLoot <= rec.loot) return null;
  // Strictly below: once this attempt holds the record, further banks raise it quietly.
  const beat = rec.loot > 0 && before < rec.loot;
  rec.loot = rec.curLoot;
  return beat ? 'loot' : null;
}

/** A boss fell at the live attempt's clock; returns 'boss' when it beat an earlier time. */
export function noteBoss(rec: WorldRecord): RecordBeat | null {
  const t = Math.max(1, Math.round(rec.curTime));
  if (rec.boss > 0 && t >= rec.boss) return null;
  const had = rec.boss > 0;
  rec.boss = t;
  return had ? 'boss' : null;
}

/** "m:ss" for a boss time. */
export function clock(secs: number): string {
  const s = Math.max(0, Math.round(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** One line for the workshop footer. */
export function recordLine(rec: WorldRecord): string {
  return `Your record on ${rec.code}: ${rec.deepest}m deep, ${rec.loot} loot${rec.boss > 0 ? `, boss in ${clock(rec.boss)}` : ''} (${rec.runs} ${rec.runs === 1 ? 'try' : 'tries'})`;
}

function int(v: unknown, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
}

/** Never throws; drops bad codes, duplicates and anything past RECORDS_MAX. */
export function sanitizeRecords(v: unknown): WorldRecord[] {
  if (!Array.isArray(v)) return [];
  const out: WorldRecord[] = [];
  for (const r of v) {
    if (out.length >= RECORDS_MAX) break;
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    if (typeof o.code !== 'string' || !isSeedCode(o.code) || out.some((k) => k.code === o.code)) continue;
    const curTime = typeof o.curTime === 'number' && Number.isFinite(o.curTime) ? Math.max(0, Math.min(1e8, o.curTime)) : 0;
    out.push({ code: o.code, deepest: int(o.deepest, 100000), loot: int(o.loot, 1e9), boss: int(o.boss, 1e8), runs: int(o.runs, 1e9), curLoot: int(o.curLoot, 1e9), curTime });
  }
  return out;
}
