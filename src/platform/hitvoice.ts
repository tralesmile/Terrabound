/**
 * Boss hit sounds: each boss answers a hit in its own material (pure table + mix, unit-tested).
 * Metal clank for the Colossus, woody thump for the Vine Queen, crystal ping for the Golem, ember
 * hiss for the Wyrm, ice crack for the Titan, digital glitch for the Hollow AI.
 */
import type { BossId } from '../sim/bosses';

export interface HitVoice {
  /** Main tone (Hz), its waveform and where it slides to. */
  freq: number;
  type: OscillatorType;
  slide: number;
  /** Optional second, higher partial (0 = none), for ringing materials. */
  ring: number;
  /** Noise burst length (s) and volume. */
  noise: number;
  noiseVol: number;
  vol: number;
  dur: number;
}

const BASE: Record<BossId, HitVoice> = {
  colossus: { freq: 220, type: 'square', slide: 140, ring: 660, noise: 0.06, noiseVol: 0.18, vol: 0.06, dur: 0.12 },
  vine_queen: { freq: 150, type: 'triangle', slide: 90, ring: 0, noise: 0.05, noiseVol: 0.12, vol: 0.12, dur: 0.1 },
  golem: { freq: 1320, type: 'triangle', slide: 1180, ring: 1980, noise: 0.02, noiseVol: 0.06, vol: 0.07, dur: 0.22 },
  wyrm: { freq: 180, type: 'sawtooth', slide: 70, ring: 0, noise: 0.14, noiseVol: 0.2, vol: 0.05, dur: 0.12 },
  titan: { freq: 900, type: 'square', slide: 300, ring: 1800, noise: 0.08, noiseVol: 0.16, vol: 0.04, dur: 0.09 },
  hollow_ai: { freq: 520, type: 'square', slide: 1560, ring: 260, noise: 0.03, noiseVol: 0.1, vol: 0.05, dur: 0.08 },
};

/** The voice for a hit on boss `id` doing `dmg`: heavier hits are a little lower and louder (capped). */
export function bossHitVoice(id: BossId, dmg: number): HitVoice {
  const v = BASE[id];
  const k = Math.min(1, Math.max(0, dmg) / 40);
  return { ...v, freq: v.freq * (1 - 0.2 * k), slide: v.slide * (1 - 0.2 * k), vol: v.vol * (1 + 0.6 * k), noiseVol: v.noiseVol * (1 + 0.5 * k) };
}
