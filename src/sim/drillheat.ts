/**
 * Drill heat (P12-A): holding the drill builds heat. A hot drill digs faster but burns battery faster, so a
 * long streak is a choice (the battery is the clock), and letting go cools it. Nothing to babysit: no extra
 * bar, the beam just glows from cyan to orange. Pure.
 */
export const HEAT = {
  /** Seconds of continuous digging from cold to full heat. */
  rise: 7,
  /** Seconds from full heat back to cold once the drill is released. */
  fall: 3,
  /** At full heat: dig speed bonus and extra battery drain. */
  speed: 0.35,
  drain: 0.6,
};

/** Next heat (0..1) after dt seconds, drilling or not. */
export function stepHeat(heat: number, drilling: boolean, dt: number): number {
  const next = heat + (drilling ? dt / HEAT.rise : -dt / HEAT.fall);
  return Math.min(1, Math.max(0, next));
}

export const heatDigMul = (heat: number): number => 1 + HEAT.speed * heat;
export const heatDrainMul = (heat: number): number => 1 + HEAT.drain * heat;

/** Beam colour for a heat level: cool cyan to hot orange, as an [r, g, b] triple. */
export function heatColor(heat: number): [number, number, number] {
  const h = Math.min(1, Math.max(0, heat));
  return [Math.round(54 + (255 - 54) * h), Math.round(224 - (224 - 140) * h), Math.round(232 - (232 - 40) * h)];
}
