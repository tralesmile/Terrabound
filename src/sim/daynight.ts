/** Day/night cycle: pure functions of game time. A full day is DAY_LENGTH seconds; dives start mid-morning. */
export const DAY_LENGTH = 600;
/** Phase offset so time 0 is mid-morning. */
const START_PHASE = 0.1;

/** 0..1 phase of the day: 0 = sunrise, 0.25 = noon, 0.5 = sunset, 0.75 = midnight. */
export function dayPhase(time: number): number {
  const p = (time / DAY_LENGTH + START_PHASE) % 1;
  return p < 0 ? p + 1 : p;
}

/** Sun height -1..1 (sin of the phase). */
export function sunHeight(time: number): number {
  return Math.sin(dayPhase(time) * Math.PI * 2);
}

/** Daylight 0 (night) .. 1 (day), with soft dawn and dusk. */
export function daylight(time: number): number {
  const h = sunHeight(time);
  const t = Math.min(1, Math.max(0, (h + 0.15) / 0.4));
  return t * t * (3 - 2 * t);
}

export function isNight(time: number): boolean {
  return daylight(time) < 0.2;
}
