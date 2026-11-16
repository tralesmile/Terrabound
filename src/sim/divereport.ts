/**
 * Dive report: what one world (a dive, from landing to signal lost) achieved, shown as a card when
 * the player dies so a run ends with a payoff instead of a bare toast. Pure: folded from game events.
 * Kept in memory only (a reload mid-dive restarts the tally; the world itself persists).
 */
import type { GameEvent } from './game';
import { layerAt } from './layers';

export interface DiveReport {
  /** Seconds played in this world. */
  time: number;
  /** Deepest point reached (m). */
  depth: number;
  mined: number;
  kills: number;
  chests: number;
  discoveries: number;
  bosses: number;
  /** Items banked at the pad during the dive. */
  banked: number;
  /** Items lost when the signal dropped (filled in at death). */
  lost: number;
  /** Deeper than any earlier dive (filled in at death). */
  best: boolean;
}

export function newDive(): DiveReport {
  return { time: 0, depth: 0, mined: 0, kills: 0, chests: 0, discoveries: 0, bosses: 0, banked: 0, lost: 0, best: false };
}

/** Fold one event into the tally. */
export function foldDive(r: DiveReport, e: GameEvent): void {
  switch (e.t) {
    case 'break': r.mined++; break;
    case 'enemykill': r.kills++; break;
    case 'chest': r.chests++; break;
    case 'discover': r.discoveries++; break;
    case 'bossdown': r.bosses++; break;
    case 'bank': r.banked += Math.max(0, e.total); break;
    default: break;
  }
}

/** A title for the dive by how deep it went (and a boss beaten). */
export function diveTitle(r: DiveReport): string {
  if (r.bosses > 0) return 'Boss breaker';
  const k = layerAt(r.depth);
  if (k >= 3) return 'Core diver';
  if (k === 2) return 'Plasma runner';
  if (k === 1) return 'Circuit delver';
  if (r.depth >= 30) return 'Scrap digger';
  return 'Surface scout';
}

/** "12:05" style time. */
export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Stat rows (label, value) for the card. Zero rows (other than depth and time) are left out. */
export function reportRows(r: DiveReport): [string, string][] {
  const rows: [string, string][] = [
    ['Deepest', `${Math.floor(r.depth)} m`],
    ['Time', clock(r.time)],
  ];
  const opt: [string, number][] = [
    ['Blocks mined', r.mined],
    ['Enemies beaten', r.kills],
    ['Bosses beaten', r.bosses],
    ['Chests opened', r.chests],
    ['Places found', r.discoveries],
    ['Items banked', r.banked],
  ];
  for (const [k, v] of opt) if (v > 0) rows.push([k, String(v)]);
  if (r.lost > 0) rows.push(['Items lost', String(r.lost)]);
  return rows;
}

/** One trip: what happened since loot was last banked (or since landing), shown as a light card at the pad. */
export interface TripReport {
  /** Items banked this time. */
  banked: number;
  /** Deepest point of this trip (m). */
  depth: number;
  mined: number;
  kills: number;
  chests: number;
  discoveries: number;
  bosses: number;
  /** Seconds since the last bank. */
  time: number;
}

/** The trip tally: the dive now minus the dive at the last bank. */
export function tripSince(now: DiveReport, start: DiveReport, deepest: number, banked: number): TripReport {
  const d = (k: 'mined' | 'kills' | 'chests' | 'discoveries' | 'bosses'): number => Math.max(0, now[k] - start[k]);
  return {
    banked: Math.max(0, banked),
    depth: Math.max(0, Math.floor(deepest)),
    mined: d('mined'),
    kills: d('kills'),
    chests: d('chests'),
    discoveries: d('discoveries'),
    bosses: d('bosses'),
    time: Math.max(0, now.time - start.time),
  };
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** Up to `max` short highlights for the trip card, most exciting first; empty stats are left out. */
export function tripChips(t: TripReport, max = 4): string[] {
  const out: string[] = [];
  if (t.bosses > 0) out.push(plural(t.bosses, 'boss down', 'bosses down'));
  if (t.depth >= 2) out.push(`${t.depth} m deep`);
  if (t.mined > 0) out.push(`${t.mined} mined`);
  if (t.kills > 0) out.push(`${t.kills} beaten`);
  if (t.chests > 0) out.push(plural(t.chests, 'chest', 'chests'));
  if (t.discoveries > 0) out.push(plural(t.discoveries, 'place found', 'places found'));
  return out.slice(0, Math.max(0, max));
}
