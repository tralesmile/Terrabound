/**
 * Blast jump (P12-A explosives): your own bomb pushes you away from the blast, mostly upward, and never
 * hurts you, so a bomb at your feet is a rocket jump. The push falls off with distance. Pure.
 */

export const BLAST_JUMP = {
  /** Upward speed (tiles/s) at point blank; a normal jump is about 12. */
  up: 17,
  /** Sideways speed at point blank. */
  side: 9,
  /** Reach beyond the blast radius (tiles) where the push fades to zero. */
  margin: 0.8,
};

/**
 * Push for a player whose body centre is (dx, dy) from the blast (dy < 0 = above it), for a blast of
 * `radius`. Returns null when out of reach.
 */
export function blastPush(dx: number, dy: number, radius: number): { vx: number; vy: number } | null {
  const reach = radius + BLAST_JUMP.margin;
  const d = Math.hypot(dx, dy);
  if (!(d < reach)) return null;
  const k = 1 - d / reach;
  const sx = dx === 0 ? 0 : Math.sign(dx);
  // Mostly up, even from a blast beside you; a blast above pushes down a little instead.
  const vy = dy <= 0.5 ? -BLAST_JUMP.up * (0.4 + 0.6 * k) : BLAST_JUMP.up * 0.3 * k;
  return { vx: sx * BLAST_JUMP.side * k, vy };
}
