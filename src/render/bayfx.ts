/**
 * Garage bay charging (per-frame, cosmetic): a crackling green arc from the bay's control light to the
 * player while the battery fills, and "+" motes that rise off the suit. Pure helpers so tests pin the look.
 */

/** Points (screen px) of a zigzag arc from (x0, y0) to (x1, y1) with `n` segments; ends are exact. */
export function bayArc(x0: number, y0: number, x1: number, y1: number, time: number, n: number, amp: number): [number, number][] {
  const out: [number, number][] = [];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  // The jitter re-rolls 12 times a second (a flicker, not a wobble) and is zero at both ends.
  const k = Math.floor(time * 12);
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const env = Math.sin(f * Math.PI);
    const j = i === 0 || i === n ? 0 : Math.sin(k * 12.9898 + i * 78.233) * amp * env;
    // A slight sag so the arc reads as a cable of light rather than a ruler line.
    const sag = env * len * 0.12;
    out.push([x0 + dx * f + nx * j, y0 + dy * f + ny * j + sag]);
  }
  return out;
}

/** Charge motes: `count` "+" marks rising from the suit, each with offset (tiles) and alpha 0-1. */
export function chargeMotes(time: number, count: number): { dx: number; dy: number; a: number }[] {
  const out: { dx: number; dy: number; a: number }[] = [];
  for (let i = 0; i < count; i++) {
    const ph = (time * 0.8 + i / count) % 1;
    out.push({ dx: Math.sin(i * 2.4 + time * 1.7) * 0.6, dy: -0.6 - ph * 1.8, a: ph < 0.15 ? ph / 0.15 : 1 - (ph - 0.15) / 0.85 });
  }
  return out;
}

/**
 * Dock cable from the bay light to a vehicle parked under the carport: `n + 1` points on a hanging curve
 * (sag grows with span) and the 0-1 position of a green pulse that runs from the bay into the vehicle.
 */
export function dockCable(x0: number, y0: number, x1: number, y1: number, time: number, n: number): { pts: [number, number][]; pulse: number } {
  const pts: [number, number][] = [];
  const sag = Math.hypot(x1 - x0, y1 - y0) * 0.22;
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    pts.push([x0 + (x1 - x0) * f, y0 + (y1 - y0) * f + Math.sin(f * Math.PI) * sag]);
  }
  return { pts, pulse: (time * 0.7) % 1 };
}
