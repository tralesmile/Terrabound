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
];

export function recipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}
