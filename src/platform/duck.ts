/**
 * Anticipation dip (P12-A): when a boss starts telegraphing an attack, the music drops for a breath so
 * the warning tone and the wind-up pose read clearly, then swells back as the attack lands.
 * Pure envelope over seconds since the warning; audio.ts applies it to the music gain.
 */

export const DUCK = {
  /** Music level at the bottom of the dip (fraction of normal). */
  floor: 0.3,
  /** Seconds to fall, hold at the floor, and recover. */
  fall: 0.06,
  hold: 0.32,
  recover: 0.4,
};

/** Music gain multiplier `t` seconds after a warning (1 when no dip is running; t < 0 = none). */
export function duckMul(t: number): number {
  if (!(t >= 0)) return 1;
  const { floor, fall, hold, recover } = DUCK;
  if (t < fall) return 1 - (1 - floor) * (t / fall);
  if (t < fall + hold) return floor;
  const r = (t - fall - hold) / recover;
  if (r >= 1) return 1;
  return floor + (1 - floor) * r;
}

/** Gain smoothing time constant: fast while a dip runs so it is audible, the usual slow fade otherwise. */
export function duckTau(t: number): number {
  return t >= 0 && t < DUCK.fall + DUCK.hold + DUCK.recover ? 0.03 : 0.4;
}
