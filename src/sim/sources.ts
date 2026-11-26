/**
 * Where materials come from, one short line each, so no recipe or quest ever sends the player to a wiki.
 * Layer depths come from layers.ts so the text stays true if the layers move. Pure.
 */
import { LAYERS } from './layers';
import type { ItemId } from './tiles';

const below = (layer: number): string => `below ${LAYERS[layer].top} m (${LAYERS[layer].name})`;

export const SOURCES: Partial<Record<ItemId, string>> = {
  rust: 'dig the red topsoil anywhere',
  metal: 'dig grey metal rock under the soil',
  iron_scrap: 'iron seams underground, and chests',
  copper_wire: 'copper veins past 25 m, drone wrecks, chests',
  crystal: 'crystal biome, chests, or past 70 m',
  biomass: 'cut trees and wild plants',
  circuit: `gold veins ${below(1)}`,
  plasma: `plasma cells ${below(2)}`,
  core_shard: `shard veins ${below(3)}`,
  fish: 'cast the rod into water',
  glowfish: 'fish at night or deep underground',
  glowcorn: 'farm it: jungle or crystal grass drops seeds',
  rustroot: 'farm it: wasteland grass drops seeds',
  ashpepper: 'farm it: ash dune grass drops seeds',
  frostberry: 'farm it: frost grass drops seeds',
};

export function sourceHint(item: ItemId): string {
  return SOURCES[item] ?? 'check the workshop';
}
