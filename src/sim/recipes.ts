import type { Inventory, ItemId } from './tiles';

export interface Recipe {
  id: string;
  name: string;
  out: ItemId;
  qty: number;
  cost: Inventory;
  /** Fabricator upgrade level needed to make this (default 0). */
  fab?: number;
  /** Raids cleared needed (raid blueprint, raids.ts); default 0. */
  raids?: number;
}

/** Fabricator recipes (base only). Inputs come from the stash, outputs go to the pack. */
export const RECIPES: Recipe[] = [
  { id: 'torch', name: 'Torch x2', out: 'torch', qty: 2, cost: { rust: 2, iron_scrap: 1 } },
  { id: 'biotorch', name: 'Bio torch x3', out: 'torch', qty: 3, cost: { biomass: 3 } },
  { id: 'beacon_colossus', name: 'Scrap beacon (Junk Colossus)', out: 'beacon_colossus', qty: 1, cost: { iron_scrap: 12, copper_wire: 6, metal: 6 } },
  { id: 'beacon_vine', name: 'Vine beacon (Vine Queen)', out: 'beacon_vine', qty: 1, cost: { biomass: 20, crystal: 4, copper_wire: 6 } },
  { id: 'beacon_golem', name: 'Prism beacon (Crystal Golem)', out: 'beacon_golem', qty: 1, cost: { crystal: 14, metal: 8 } },
  { id: 'beacon_wyrm', name: 'Ember beacon (Ash Wyrm)', out: 'beacon_wyrm', qty: 1, cost: { crystal: 12, copper_wire: 14, metal: 10 } },
  { id: 'beacon_ai', name: 'Core key (The Hollow AI)', out: 'beacon_ai', qty: 1, cost: { core_shard: 10, plasma: 10, circuit: 10 } },
  { id: 'beacon_titan', name: 'Frost beacon (Frost Titan)', out: 'beacon_titan', qty: 1, cost: { crystal: 20, metal: 16, copper_wire: 10 } },
  { id: 'ladder', name: 'Ladder x4', out: 'ladder', qty: 4, cost: { rust: 3, iron_scrap: 1 } },
  { id: 'scaffold', name: 'Scaffold x6', out: 'scaffold', qty: 6, cost: { rust: 4 } },
  { id: 'platform', name: 'Platform x4', out: 'platform', qty: 4, cost: { rust: 3 } },
  { id: 'door', name: 'Door x1', out: 'door', qty: 1, cost: { rust: 2, iron_scrap: 1 } },
  { id: 'wall', name: 'Back wall x6', out: 'wall', qty: 6, cost: { rust: 3 } },
  { id: 'plate', name: 'Metal plate x2', out: 'metal', qty: 2, cost: { iron_scrap: 3, rust: 2 }, fab: 1 },
  { id: 'solar', name: 'Solar cell x1', out: 'solar', qty: 1, cost: { metal: 2, crystal: 1 }, fab: 1 },
  { id: 'battery', name: 'Battery x1', out: 'battery', qty: 1, cost: { metal: 3, copper_wire: 1 }, fab: 1 },
  { id: 'miner', name: 'Miner rig x1', out: 'miner', qty: 1, cost: { metal: 3, copper_wire: 2 }, fab: 2 },
  { id: 'drone', name: 'Drone bay x1', out: 'drone', qty: 1, cost: { metal: 4, copper_wire: 3, crystal: 1 }, fab: 2 },
  { id: 'spikes', name: 'Spike trap x2', out: 'spikes', qty: 2, cost: { iron_scrap: 3, metal: 1 }, fab: 1 },
  { id: 'reinforced', name: 'Reinforced wall x4', out: 'reinforced', qty: 4, cost: { metal: 3, iron_scrap: 2 }, fab: 1 },
  { id: 'shield', name: 'Shield wall x4', out: 'shield', qty: 4, cost: { metal: 4, crystal: 2, copper_wire: 2 }, fab: 1, raids: 6 },
  { id: 'turret', name: 'Turret x1', out: 'turret', qty: 1, cost: { metal: 4, copper_wire: 3, crystal: 1 }, fab: 2 },
  { id: 'table', name: 'Table x1', out: 'table', qty: 1, cost: { rust: 4, iron_scrap: 1 } },
  { id: 'bed', name: 'Bunk bed x1', out: 'bed', qty: 1, cost: { rust: 4, biomass: 2 } },
  { id: 'lamp', name: 'Lamp x2', out: 'lamp', qty: 2, cost: { iron_scrap: 1, crystal: 1 } },
  { id: 'screen', name: 'Wall screen x1', out: 'screen', qty: 1, cost: { metal: 1, copper_wire: 1 }, fab: 1 },
  { id: 'potplant', name: 'Potted plant x1', out: 'potplant', qty: 1, cost: { rust: 1, biomass: 2 } },
  { id: 'chair', name: 'Chair x2', out: 'chair', qty: 2, cost: { rust: 3 } },
  { id: 'banner', name: 'Banner x1', out: 'banner', qty: 1, cost: { biomass: 2, rust: 1 } },
  { id: 'smelter', name: 'Smelter x1', out: 'smelter', qty: 1, cost: { metal: 4, copper_wire: 2 }, fab: 2 },
];

export function recipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}
