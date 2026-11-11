/**
 * Procedural music: pure note generation per bar from a mood (biome, depth layer, night, boss fight).
 * No audio files. Deterministic: the same mood and bar always give the same notes.
 */
export interface Mood {
  biome: number;
  layer: number;
  night: boolean;
  boss: boolean;
}

export type Voice = 'pad' | 'bass' | 'lead' | 'drum';

export interface Note {
  /** Start in beats from the bar start. */
  beat: number;
  /** Length in beats. */
  len: number;
  freq: number;
  voice: Voice;
  vol: number;
}

/** Scale steps (semitones) and root (MIDI) per biome. */
const SCALES: Record<number, { root: number; steps: number[] }> = {
  0: { root: 57, steps: [0, 3, 5, 7, 10] }, // Rust Wastes: A minor pentatonic, dusty
  1: { root: 50, steps: [0, 2, 3, 5, 7, 9, 10] }, // Overgrown Ruins: D dorian, warm
  2: { root: 64, steps: [0, 2, 4, 6, 7, 9, 11] }, // Crystal Flats: E lydian, bright
  3: { root: 48, steps: [0, 1, 3, 5, 7, 8, 10] }, // Ash Dunes: C phrygian, tense
  4: { root: 52, steps: [0, 2, 3, 7, 8] }, // Frozen Spires: sparse minor, icy
};

export const BEATS_PER_BAR = 4;

export function midiToFreq(m: number): number {
  return 440 * 2 ** ((m - 69) / 12);
}

function h(a: number, b: number): number {
  let x = (a * 374761393 + b * 668265263) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/** Tempo in beats per minute: slower and lower deeper down, faster in boss fights. */
export function tempo(m: Mood): number {
  if (m.boss) return 132;
  return Math.max(56, 84 - m.layer * 8 - (m.night ? 6 : 0));
}

/** Notes of one bar. Chord changes every bar on a 4-bar loop; the lead varies with the bar number. */
export function composeBar(m: Mood, bar: number): Note[] {
  const sc = SCALES[m.biome] ?? SCALES[0];
  const root = sc.root - m.layer * 5 - (m.boss ? 12 : 0);
  const deg = (i: number): number => {
    const n = sc.steps.length;
    const o = Math.floor(i / n);
    return root + sc.steps[((i % n) + n) % n] + o * 12;
  };
  const prog = [0, 3, 4, 2];
  const chordRoot = prog[bar % 4];
  const out: Note[] = [];
  // Pad: a soft triad held for the bar (quieter at night, absent in boss fights).
  if (!m.boss) for (const k of [0, 2, 4]) out.push({ beat: 0, len: BEATS_PER_BAR, freq: midiToFreq(deg(chordRoot + k)), voice: 'pad', vol: m.night ? 0.03 : 0.045 });
  // Bass: root on beats 1 and 3 (every beat in a boss fight).
  for (let b = 0; b < BEATS_PER_BAR; b += m.boss ? 1 : 2) out.push({ beat: b, len: m.boss ? 0.8 : 1.6, freq: midiToFreq(deg(chordRoot) - 12), voice: 'bass', vol: 0.09 });
  // Lead: sparse melody, more notes in boss fights, fewer at night and deep down.
  const density = m.boss ? 0.8 : Math.max(0.15, 0.5 - m.layer * 0.1 - (m.night ? 0.15 : 0));
  for (let s = 0; s < BEATS_PER_BAR * 2; s++) {
    if (h(bar, s + 17 * m.biome) > density) continue;
    const step = chordRoot + Math.floor(h(bar * 7 + s, 3) * 6) + 5;
    out.push({ beat: s / 2, len: 0.45, freq: midiToFreq(deg(step)), voice: 'lead', vol: 0.05 });
  }
  // Drums only in boss fights: kick on every beat, hat on the off-beats.
  if (m.boss) for (let b = 0; b < BEATS_PER_BAR; b++) {
    out.push({ beat: b, len: 0.2, freq: 60, voice: 'drum', vol: 0.18 });
    out.push({ beat: b + 0.5, len: 0.05, freq: 8000, voice: 'drum', vol: 0.03 });
  }
  return out;
}
