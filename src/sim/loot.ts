/** Chest loot: deterministic from the world seed and chest position. Free, visible, never paid. */
import { hash2 } from './rng';
import type { Inventory, ItemId } from './tiles';

interface LootRow {
  item: ItemId;
  min: number;
  max: number;
  /** Minimum depth (rows below the pad) for this row to roll. */
  depth: number;
  chance: number;
}

export const LOOT: LootRow[] = [
  { item: 'iron_scrap', min: 3, max: 7, depth: -99, chance: 0.9 },
  { item: 'copper_wire', min: 2, max: 5, depth: -99, chance: 0.6 },
  { item: 'torch', min: 2, max: 4, depth: -99, chance: 0.5 },
  { item: 'crystal', min: 1, max: 3, depth: -99, chance: 0.35 },
  { item: 'crystal', min: 2, max: 5, depth: 40, chance: 0.7 },
  { item: 'ladder', min: 3, max: 6, depth: -99, chance: 0.3 },
];

export function chestLoot(seed: number, x: number, y: number, depth: number): Inventory {
  const inv: Inventory = {};
  LOOT.forEach((row, i) => {
    if (depth < row.depth) return;
    if (hash2(x * 7 + i, y, seed ^ 0xc4e5) >= row.chance) return;
    const n = row.min + Math.floor(hash2(y + i, x, seed ^ 0x10e7) * (row.max - row.min + 1));
    inv[row.item] = (inv[row.item] ?? 0) + n;
  });
  if (Object.keys(inv).length === 0) inv.iron_scrap = 3;
  return inv;
}
