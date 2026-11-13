/** World dimensions in tiles (own module so save.ts can use them without importing worldgen). */

/** New worlds: wide enough that each biome is a region to explore, deep enough for all four layers. */
export const WORLD_W = 2800;
export const WORLD_H = 480;
/** Worlds made before save v28 keep this size (their edits are stored by tile index). */
export const LEGACY_WORLD = { w: 1400, h: 420 } as const;
