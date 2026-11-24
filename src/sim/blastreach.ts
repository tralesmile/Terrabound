/**
 * Blast reach (P12-A explosives part 2): a blast breaks any block in its inner core, but the outer ring
 * only breaks soft blocks, so a bomb opens a tunnel in dirt yet only scuffs the edges of hard rock. Pure.
 */

export const BLAST_REACH = {
  /** Fraction of the radius that breaks everything minable. */
  core: 0.55,
  /** Hardness the very edge of the blast can still break. */
  edgeHardness: 1.0,
  /** Hardness broken at the core edge (anything). */
  coreHardness: 99,
};

/** Highest block hardness a blast of `radius` breaks at distance `d` from its centre. */
export function blastHardnessAt(d: number, radius: number): number {
  const f = radius > 0 ? d / radius : 1;
  if (f <= BLAST_REACH.core) return BLAST_REACH.coreHardness;
  const k = Math.min(1, (f - BLAST_REACH.core) / (1 - BLAST_REACH.core));
  return BLAST_REACH.edgeHardness * (1 - 0.5 * k) + 0.0001;
}

export function blastBreaks(d: number, radius: number, hardness: number): boolean {
  return hardness <= blastHardnessAt(d, radius);
}
