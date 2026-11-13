/**
 * Boss health bar juice (UI only): a pale "damage chip" lags behind the health fill, holds briefly after a hit,
 * then drains down to it, so every hit shows how much it took. Pure step so the timing is unit-tested.
 */

/** Seconds the chip holds still after a hit before draining. */
export const CHIP_HOLD = 0.4;
/** How fast the chip drains (fraction of max health per second). */
export const CHIP_DRAIN = 0.6;
/** Health fraction where the boss turns enraged (phase 2); the bar draws a notch there. */
export const PHASE_NOTCH = 0.5;

export interface ChipState {
  /** Where the chip ends (0..1 of max). */
  chip: number;
  /** Health last frame (0..1). */
  last: number;
  /** Seconds left to hold before draining. */
  hold: number;
}

export function newChip(hp: number): ChipState {
  return { chip: hp, last: hp, hold: 0 };
}

/** Advance the chip toward `hp` (0..1). A heal or a new fight snaps it up; a hit holds, then drains. Pure. */
export function stepChip(s: ChipState, hp: number, dt: number): ChipState {
  const h = Math.max(0, Math.min(1, hp));
  if (h >= s.chip) return { chip: h, last: h, hold: 0 };
  let hold = h < s.last - 1e-9 ? CHIP_HOLD : Math.max(0, s.hold - dt);
  let chip = s.chip;
  if (hold <= 0) chip = Math.max(h, chip - CHIP_DRAIN * dt);
  if (chip <= h) hold = 0;
  return { chip, last: h, hold };
}
