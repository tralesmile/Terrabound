/**
 * Boss attack telegraph sounds: a rising tone that lasts the whole warning, so the hit can be timed
 * by ear (pure table, unit-tested). The pitch climbs to a peak at the moment the attack lands.
 */
import { ATTACK_TIME, type AttackKind } from '../sim/bosses';

export interface WarnVoice {
  from: number;
  to: number;
  dur: number;
  type: OscillatorType;
  vol: number;
}

const BASE: Record<AttackKind, { from: number; to: number; type: OscillatorType; vol: number }> = {
  slam: { from: 90, to: 260, type: 'triangle', vol: 0.12 },
  rain: { from: 300, to: 700, type: 'sine', vol: 0.07 },
  charge: { from: 150, to: 600, type: 'sawtooth', vol: 0.05 },
  volley: { from: 500, to: 900, type: 'square', vol: 0.05 },
  summon: { from: 200, to: 420, type: 'sine', vol: 0.08 },
  grid: { from: 300, to: 1800, type: 'sawtooth', vol: 0.05 },
};

/** Voice for the telegraph of an attack; its length matches the warning time. */
export function warnVoice(kind: AttackKind): WarnVoice {
  return { ...BASE[kind], dur: ATTACK_TIME[kind].warn };
}
