/** Player options (settings screen): volumes, screen shake, UI size. Pure data + helpers, saved in SaveData.settings. */

export interface Prefs {
  /** 0..10 each. */
  master: number;
  musicVol: number;
  sfxVol: number;
  /** 0 off, 1 low, 2 full. */
  shake: number;
  /** 0 normal, 1 large, 2 huge. */
  uiSize: number;
}

export type PrefKey = keyof Prefs;

export const DEFAULT_PREFS: Prefs = { master: 8, musicVol: 7, sfxVol: 8, shake: 2, uiSize: 0 };

interface PrefDef {
  key: PrefKey;
  label: string;
  max: number;
  names?: readonly string[];
}

/** Rows of the settings screen, top to bottom. */
export const PREFS: readonly PrefDef[] = [
  { key: 'master', label: 'MASTER VOLUME', max: 10 },
  { key: 'musicVol', label: 'MUSIC', max: 10 },
  { key: 'sfxVol', label: 'EFFECTS', max: 10 },
  { key: 'shake', label: 'SCREEN SHAKE', max: 2, names: ['OFF', 'LOW', 'FULL'] },
  { key: 'uiSize', label: 'UI SIZE (TEXT AND BUTTONS)', max: 2, names: ['NORMAL', 'LARGE', 'HUGE'] },
];

function def(key: PrefKey): PrefDef {
  return PREFS.find((p) => p.key === key) ?? PREFS[0];
}

/** Clamp an untrusted value (old saves, tampered storage) into range; falls back to the default. */
export function cleanPref(key: PrefKey, v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return DEFAULT_PREFS[key];
  return Math.max(0, Math.min(def(key).max, Math.round(v)));
}

export function cleanPrefs(r: Record<string, unknown>): Prefs {
  const out = { ...DEFAULT_PREFS };
  for (const p of PREFS) out[p.key] = cleanPref(p.key, r[p.key]);
  return out;
}

/** Step one option by d, clamped (no wrap: a volume never jumps from 10 to 0). */
export function stepPref(p: Prefs, key: PrefKey, d: number): Prefs {
  return { ...p, [key]: Math.max(0, Math.min(def(key).max, p[key] + Math.sign(d))) };
}

export function prefValueLabel(p: Prefs, key: PrefKey): string {
  const d = def(key);
  return d.names ? d.names[p[key]] ?? String(p[key]) : `${p[key] * 10}%`;
}

/** Linear 0..1 gains for the audio buses (muted means silent master). */
export function audioGains(p: Prefs, muted: boolean): { master: number; music: number; sfx: number } {
  return { master: muted ? 0 : p.master / 10, music: p.musicVol / 10, sfx: p.sfxVol / 10 };
}

export function shakeMul(p: Prefs): number {
  return [0, 0.45, 1][p.shake] ?? 1;
}

export function uiScale(p: Prefs): number {
  return [1, 1.18, 1.36][p.uiSize] ?? 1;
}
