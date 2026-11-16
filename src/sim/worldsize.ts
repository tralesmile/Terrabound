/** World dimensions in tiles (own module so save.ts can use them without importing worldgen). */

/** New worlds: wide enough that each biome is a region to explore, deep enough for all four layers. */
export const WORLD_W = 2800;
export const WORLD_H = 480;
/** Worlds made before save v28 keep this size (their edits are stored by tile index). */
export const LEGACY_WORLD = { w: 1400, h: 420 } as const;

/** True for a world smaller than the current new-world size (made before save v28). */
export function isLegacySize(s: { w: number; h: number }): boolean {
  return s.w < WORLD_W || s.h < WORLD_H;
}

/**
 * One-line pitch for starting a bigger world from a legacy save, or null for a current-size world.
 * Says what grows and what carries over, so the choice is clear (no pressure, no timer).
 */
export function biggerWorldPitch(s: { w: number; h: number }): string | null {
  if (!isLegacySize(s)) return null;
  const ratio = Math.round((WORLD_W / Math.max(1, s.w)) * 10) / 10;
  return `New worlds are ${ratio}x as wide (${WORLD_W} x ${WORLD_H}). BIGGER WORLD in the workshop makes one; your stash, base and upgrades come along`;
}
