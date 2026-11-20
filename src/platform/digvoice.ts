/**
 * Per-material drill sounds (P12-A dig feedback): each block family has its own voice, and every tick
 * varies the pitch a little so a long dig never sounds like a metronome. Pure data plus a pure pitch helper.
 */
import type { BreakStyle } from '../render/breakfx';

export interface DigVoice {
  /** Base tone frequency (Hz) and wave. */
  freq: number;
  wave: OscillatorType;
  /** Tone and noise volumes, and tone length (s). */
  vol: number;
  noise: number;
  dur: number;
}

export const DIG_VOICE: Record<BreakStyle, DigVoice> = {
  dirt: { freq: 110, wave: 'triangle', vol: 0.05, noise: 0.26, dur: 0.05 },
  stone: { freq: 150, wave: 'square', vol: 0.06, noise: 0.22, dur: 0.05 },
  metal: { freq: 520, wave: 'square', vol: 0.045, noise: 0.12, dur: 0.04 },
  crystal: { freq: 880, wave: 'triangle', vol: 0.05, noise: 0.08, dur: 0.06 },
  wood: { freq: 200, wave: 'triangle', vol: 0.06, noise: 0.16, dur: 0.05 },
  leaf: { freq: 260, wave: 'sine', vol: 0.03, noise: 0.18, dur: 0.04 },
  tech: { freq: 640, wave: 'sawtooth', vol: 0.035, noise: 0.1, dur: 0.04 },
};

/** Pitch spread either side of the base (8%). */
export const DIG_PITCH_SPREAD = 0.08;

/** Frequency for one drill tick: base * (1 +- spread) from r in 0..1. */
export function digPitch(base: number, r: number): number {
  return base * (1 - DIG_PITCH_SPREAD + 2 * DIG_PITCH_SPREAD * Math.min(1, Math.max(0, r)));
}
