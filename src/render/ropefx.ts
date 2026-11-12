/**
 * Grappling rope shape (cosmetic, pure). A taut rope is straight; a slack rope sags
 * under gravity; a fresh attach twangs (a decaying standing wave) for ~0.4 s.
 * All values are in world tiles so the renderer just maps the points to the screen.
 */

export const ROPE_SEGMENTS = 14;
/** Seconds the attach twang lasts. */
export const TWANG_TIME = 0.4;

export interface RopePoint {
  x: number;
  y: number;
}

/** Sag depth in tiles for a rope of `len` spanning `dist`: grows with slack, capped. */
export function ropeSag(dist: number, len: number): number {
  const slack = Math.max(0, len - dist);
  if (slack <= 0) return 0;
  return Math.min(1.6, Math.sqrt(slack * Math.max(dist, 0.5)) * 0.55);
}

/** Twang amplitude in tiles at `age` seconds after attaching (0 once it has rung out). */
export function twangAmp(age: number): number {
  if (age < 0 || age >= TWANG_TIME) return 0;
  return 0.32 * Math.exp(-age * 9) * Math.cos(age * 55);
}

/**
 * Rope points from the hand (x0, y0) to the anchor (x1, y1). Sag pulls the middle
 * down (screen +y); the twang wiggles it across the rope's own direction.
 */
export function ropePoints(x0: number, y0: number, x1: number, y1: number, len: number, age: number): RopePoint[] {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const sag = ropeSag(dist, len);
  const tw = twangAmp(age);
  // Unit normal to the rope.
  const nx = dist > 1e-6 ? -dy / dist : 0;
  const ny = dist > 1e-6 ? dx / dist : 0;
  const pts: RopePoint[] = [];
  for (let i = 0; i <= ROPE_SEGMENTS; i++) {
    const s = i / ROPE_SEGMENTS;
    const bell = 4 * s * (1 - s); // 0 at both ends, 1 in the middle
    const wave = Math.sin(Math.PI * s * 2) * 0.6 + bell * 0.4;
    pts.push({
      x: x0 + dx * s + nx * tw * wave,
      y: y0 + dy * s + sag * bell + ny * tw * wave,
    });
  }
  return pts;
}
