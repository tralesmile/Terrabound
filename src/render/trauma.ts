/**
 * Trauma screen shake (render only): the offset is trauma squared times a smooth noise, so light hits
 * barely move the view, heavy ones kick hard, and stacked hits build up then fade. The shake setting
 * (shakeMul, 0 for off / reduced motion) scales it. Pure.
 */

/** Max offset in art pixels at full trauma (multiplied by the pixel scale). */
export const SHAKE_PX = 6;

/** Smooth noise in -1..1 from a sum of incommensurate sines (no per-frame jitter, no Math.random). */
export function shakeNoise(t: number, seed: number): number {
  return Math.sin(t * 47 + seed * 1.7) * 0.5 + Math.sin(t * 73 + seed * 4.1) * 0.3 + Math.sin(t * 119 + seed * 2.3) * 0.2;
}

/** Screen offset in art pixels for this trauma (0..1) at time t. */
export function traumaOffset(trauma: number, t: number, mul: number): { x: number; y: number } {
  const k = Math.min(1, Math.max(0, trauma)) ** 2 * SHAKE_PX * Math.max(0, mul);
  if (k === 0) return { x: 0, y: 0 };
  return { x: shakeNoise(t, 1) * k, y: shakeNoise(t, 7) * k };
}
