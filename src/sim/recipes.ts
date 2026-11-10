import type { Inventory, ItemId } from './tiles';

export interface Recipe {
  id: string;
  name: string;
  out: ItemId;
  qty: number;
  cost: Inventory;
}

/** Fabricator recipes (base only). Inputs come from the stash, outputs go to the pack. */
export const RECIPES: Recipe[] = [
  { id: 'torch', name: 'Torch x2', out: 'torch', qty: 2, cost: { rust: 2, iron_scrap: 1 } },
  { id: 'ladder', name: 'Ladder x4', out: 'ladder', qty: 4, cost: { rust: 3, iron_scrap: 1 } },
  { id: 'scaffold', name: 'Scaffold x6', out: 'scaffold', qty: 6, cost: { rust: 4 } },
  { id: 'platform', name: 'Platform x4', out: 'platform', qty: 4, cost: { rust: 3 } },
  { id: 'door', name: 'Door x1', out: 'door', qty: 1, cost: { rust: 2, iron_scrap: 1 } },
  { id: 'wall', name: 'Back wall x6', out: 'wall', qty: 6, cost: { rust: 3 } },
];

export function recipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}
