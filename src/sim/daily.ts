/** Daily Dive: one world code per UTC day, identical for every player. Pure; the caller supplies the clock. */
import { encodeSeed } from './seedcode';

const DAY_MS = 86_400_000;

/** Whole UTC days since 1970-01-01 (no time zone or DST involved). */
export function utcDay(nowMs: number): number {
  return Math.floor((Number.isFinite(nowMs) ? nowMs : 0) / DAY_MS);
}

/** 32-bit seed for a UTC day (integer hash, so neighbouring days give unrelated worlds). */
export function dailySeed(day: number): number {
  let h = (Math.floor(day) ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export function dailyCode(nowMs: number): string {
  return encodeSeed(dailySeed(utcDay(nowMs)));
}
