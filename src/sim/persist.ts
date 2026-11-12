/**
 * Persistent world: the world is regenerated from its seed on load, then the player's edits are replayed.
 * Edits (tiles and back walls changed since generation) and the explored map are stored as compact strings.
 * Decoders never throw and ignore anything out of range.
 *
 * Diff format: "<delta>.<value>[*<run>]" tokens joined by ",", base36. delta is the index step from the
 * previous entry's last index (first entry: from -1); run (default 1) repeats the value on consecutive indices.
 * Fog format: base36 run lengths joined by ",", alternating unseen/seen, starting with unseen.
 */
import { STAGE_TIME, cropAt } from './farming';
import { ITEM_IDS, T, TILES, type Inventory } from './tiles';
import type { World } from './world';
import { W } from './world';
import type { FogMap } from './explore';

/** Hard cap on stored edits so a save can never grow without bound (~ 1/5 of the world). */
export const MAX_EDITS = 120_000;

export function encodeEdits(edits: Map<number, number>): string {
  const keys = [...edits.keys()].sort((a, b) => a - b);
  const out: string[] = [];
  let prev = -1;
  let i = 0;
  while (i < keys.length && i < MAX_EDITS) {
    const start = keys[i];
    const v = edits.get(start) ?? 0;
    let run = 1;
    while (i + run < keys.length && keys[i + run] === start + run && edits.get(keys[i + run]) === v) run++;
    out.push(`${(start - prev).toString(36)}.${v.toString(36)}${run > 1 ? `*${run.toString(36)}` : ''}`);
    prev = start + run - 1;
    i += run;
  }
  return out.join(',');
}

/** Decode into index -> value; entries with index >= size or value > maxValue are dropped. */
export function decodeEdits(s: unknown, size: number, maxValue: number): Map<number, number> {
  const m = new Map<number, number>();
  if (typeof s !== 'string' || s.length === 0) return m;
  let prev = -1;
  for (const tok of s.split(',')) {
    const dot = tok.indexOf('.');
    if (dot <= 0) continue;
    const star = tok.indexOf('*', dot);
    const delta = parseInt(tok.slice(0, dot), 36);
    const value = parseInt(tok.slice(dot + 1, star < 0 ? undefined : star), 36);
    const run = star < 0 ? 1 : parseInt(tok.slice(star + 1), 36);
    if (!(delta > 0) || !(value >= 0) || !(run >= 1) || value > maxValue) continue;
    const start = prev + delta;
    if (start + run > size) break;
    for (let k = 0; k < run && m.size < MAX_EDITS; k++) m.set(start + k, value);
    prev = start + run - 1;
  }
  return m;
}

export function encodeFog(seen: Uint8Array): string {
  const runs: number[] = [];
  let cur = 0;
  let n = 0;
  for (let i = 0; i < seen.length; i++) {
    const v = seen[i] ? 1 : 0;
    if (v === cur) n++;
    else {
      runs.push(n);
      cur = v;
      n = 1;
    }
  }
  runs.push(n);
  return runs.map((r) => r.toString(36)).join(',');
}

export function decodeFog(s: unknown, fog: FogMap): void {
  if (typeof s !== 'string' || s.length === 0) return;
  let i = 0;
  let v = 0;
  for (const tok of s.split(',')) {
    const n = parseInt(tok, 36);
    if (!(n >= 0)) return;
    if (v) fog.seen.fill(1, i, Math.min(fog.seen.length, i + n));
    i += n;
    v ^= 1;
    if (i >= fog.seen.length) break;
  }
  fog.version++;
}

export interface WorldDiff {
  tiles: string;
  walls: string;
  fog: string;
  /** v8: contents of opened and placed chests, JSON [[index, {item: n}], ...]. */
  chests?: string;
  /** v8: growing saplings, edit-diff format with seconds left as the value. */
  saplings?: string;
}

export function encodeChests(chests: Map<number, Inventory>): string {
  const out: [number, Inventory][] = [];
  for (const [i, inv] of chests) out.push([i, inv]);
  return out.length ? JSON.stringify(out) : '';
}

/** Never throws; drops bad indices, unknown items and non-positive counts. */
export function decodeChests(s: unknown, size: number): Map<number, Inventory> {
  const m = new Map<number, Inventory>();
  if (typeof s !== 'string' || !s) return m;
  let raw: unknown;
  try {
    raw = JSON.parse(s);
  } catch {
    return m;
  }
  if (!Array.isArray(raw)) return m;
  for (const e of raw) {
    if (!Array.isArray(e) || e.length !== 2) continue;
    const [i, inv] = e as [unknown, unknown];
    if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= size || !inv || typeof inv !== 'object') continue;
    const clean: Inventory = {};
    for (const id of ITEM_IDS) {
      const n = (inv as Record<string, unknown>)[id];
      if (typeof n === 'number' && Number.isFinite(n) && n > 0) clean[id] = Math.min(1e6, Math.floor(n));
    }
    m.set(i, clean);
  }
  return m;
}

function growingCrop(tile: number): boolean {
  const c = cropAt(tile);
  return c !== null && c.stage < 2;
}

export function captureDiff(world: World, fog: FogMap): WorldDiff {
  const sap = new Map<number, number>();
  for (const [i, t] of world.saplings) sap.set(i, Math.max(1, Math.ceil(t)));
  // Crop stage timers share the sapling diff (the tile at the index says which it is; no save field change).
  for (const [i, t] of world.crops) sap.set(i, Math.max(1, Math.ceil(t)));
  return { tiles: encodeEdits(world.edits), walls: encodeEdits(world.wallEdits), fog: encodeFog(fog.seen), chests: encodeChests(world.chests), saplings: encodeEdits(sap) };
}

/** Replay saved edits onto a freshly generated world of the same seed. */
export function applyDiff(world: World, fog: FogMap, diff: WorldDiff | null): void {
  if (!diff) return;
  const size = world.w * world.h;
  for (const [i, t] of decodeEdits(diff.tiles, size, TILES.length - 1)) world.set(i % world.w, Math.floor(i / world.w), t);
  const maxWall = Math.max(...Object.values(W));
  for (const [i, wl] of decodeEdits(diff.walls, size, maxWall)) world.setWall(i % world.w, Math.floor(i / world.w), wl);
  decodeFog(diff.fog, fog);
  // Chests and saplings only count where the tile still is one (edits were replayed above).
  for (const [i, inv] of decodeChests(diff.chests, size)) if (world.tiles[i] === T.CHEST) world.chests.set(i, inv);
  for (const [i, t] of decodeEdits(diff.saplings, size, 10_000)) {
    if (world.tiles[i] === T.SAPLING) world.saplings.set(i, t);
    else if (growingCrop(world.tiles[i])) world.crops.set(i, Math.min(t, STAGE_TIME));
  }
  // A growing crop that lost its timer (older diff) restarts its stage instead of stalling forever.
  for (const [i, t] of world.edits) if (growingCrop(t) && world.tiles[i] === t && !world.crops.has(i)) world.crops.set(i, STAGE_TIME);
}

export function sanitizeDiff(v: unknown): WorldDiff | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Record<string, unknown>;
  const str = (x: unknown): string => (typeof x === 'string' && x.length < 4_000_000 ? x : '');
  // v7 -> v8: chests and saplings are new (missing means none opened / none planted).
  const d = { tiles: str(r.tiles), walls: str(r.walls), fog: str(r.fog), chests: str(r.chests), saplings: str(r.saplings) };
  return d.tiles || d.walls || d.fog || d.chests || d.saplings ? d : null;
}
