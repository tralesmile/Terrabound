/**
 * Dig-power tiers (P12-A): the richest ore of each deep layer needs a minimum Drill bit level, so drill
 * upgrades open new loot instead of only digging faster. Only ores are gated, never a layer's rock, so a
 * layer can always be dug through (no progression wall). No luck: the level is shown on the tile tip.
 */
import { T } from './tiles';

/** Minimum Drill bit level per tile (missing = any drill). */
export const DRILL_TIER: Readonly<Partial<Record<number, number>>> = {
  [T.CIRCUIT_ORE]: 1,
  [T.PLASMA_ORE]: 2,
  [T.CORE_ORE]: 3,
};

/** Drill bit level a tile needs (0 = any). */
export function drillNeeded(tile: number): number {
  return DRILL_TIER[tile] ?? 0;
}

/** True when a drill at `pickLevel` can dig this tile. */
export function canDrill(tile: number, pickLevel: number): boolean {
  return pickLevel >= drillNeeded(tile);
}
