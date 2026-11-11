/**
 * Weather and world events, scheduled per in-game day from the world seed (deterministic, visible to the
 * player as a toast and HUD line). Dust storms cut visibility, meteor showers drop rare ore, an eclipse
 * turns the day dark and brings stronger enemies with better loot.
 */
import { hash2 } from './rng';
import { DAY_LENGTH, dayPhase } from './daynight';

export type WeatherKind = 'clear' | 'dust' | 'meteors' | 'eclipse';

export interface WeatherDef {
  name: string;
  desc: string;
}

export const WEATHER: Record<WeatherKind, WeatherDef> = {
  clear: { name: 'Clear skies', desc: '' },
  dust: { name: 'Dust storm', desc: 'Visibility drops on the surface' },
  meteors: { name: 'Meteor shower', desc: 'Falling stars bring rare ore: watch the sky!' },
  eclipse: { name: 'Eclipse', desc: 'Darkness at noon: stronger enemies, richer loot' },
};

/** Day index for a game time. */
export function dayOf(time: number): number {
  return Math.floor(time / DAY_LENGTH + 0.1);
}

/**
 * The event of a given day and the phase window it runs in. Roughly: 55% clear, 20% dust (daytime),
 * 15% meteors (night), 10% eclipse (around noon). Day 0 is always clear so the first session is calm.
 */
export function eventForDay(seed: number, day: number): { kind: WeatherKind; from: number; to: number } {
  if (day <= 0) return { kind: 'clear', from: 0, to: 0 };
  const r = hash2(day, 41, seed);
  if (r < 0.55) return { kind: 'clear', from: 0, to: 0 };
  if (r < 0.75) return { kind: 'dust', from: 0.05, to: 0.35 };
  if (r < 0.9) return { kind: 'meteors', from: 0.62, to: 0.88 };
  return { kind: 'eclipse', from: 0.18, to: 0.32 };
}

/** The weather right now. */
export function weatherAt(seed: number, time: number): WeatherKind {
  const e = eventForDay(seed, dayOf(time));
  if (e.kind === 'clear') return 'clear';
  const p = dayPhase(time);
  return p >= e.from && p < e.to ? e.kind : 'clear';
}

/** Surface light multiplier from the weather (the eclipse is near-night darkness). */
export function weatherLight(kind: WeatherKind): number {
  return kind === 'eclipse' ? 0.15 : kind === 'dust' ? 0.7 : 1;
}

/** Enemy health multiplier and chance of a bonus crystal drop. */
export function weatherEnemy(kind: WeatherKind): { hp: number; bonus: number } {
  return kind === 'eclipse' ? { hp: 1.5, bonus: 0.5 } : { hp: 1, bonus: 0 };
}

/** Meteors per second during a shower. */
export const METEOR_RATE = 0.25;
