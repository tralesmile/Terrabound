/** Static content tables: tiles and items. Add new content here first, then wire it into worldgen/crafting. */

export type ItemId = 'rust' | 'metal' | 'iron_scrap' | 'copper_wire' | 'torch' | 'ladder' | 'scaffold';
export const ITEM_IDS: ItemId[] = ['rust', 'metal', 'iron_scrap', 'copper_wire', 'torch', 'ladder', 'scaffold'];

export const T = {
  AIR: 0,
  RUST: 1,
  METAL: 2,
  IRON: 3,
  COPPER: 4,
  BEDROCK: 5,
  PAD: 6,
  TORCH: 7,
  LADDER: 8,
  SCAFFOLD: 9,
} as const;

export interface TileDef {
  name: string;
  /** Seconds to break at dig power 1. Infinity = unbreakable. */
  hardness: number;
  solid: boolean;
  drop: ItemId | null;
  /** Breakable even though not solid (torches). */
  minable?: boolean;
  /** Player can climb here. */
  climb?: boolean;
}

export const TILES: TileDef[] = [
  { name: 'Air', hardness: 0, solid: false, drop: null },
  { name: 'Rust', hardness: 0.35, solid: true, drop: 'rust' },
  { name: 'Metal plate', hardness: 0.9, solid: true, drop: 'metal' },
  { name: 'Iron scrap', hardness: 1.2, solid: true, drop: 'iron_scrap' },
  { name: 'Copper vein', hardness: 1.6, solid: true, drop: 'copper_wire' },
  { name: 'Bedrock', hardness: Infinity, solid: true, drop: null },
  { name: 'Landing pad', hardness: Infinity, solid: true, drop: null },
  { name: 'Torch', hardness: 0.1, solid: false, drop: 'torch', minable: true },
  { name: 'Ladder', hardness: 0.1, solid: false, drop: 'ladder', minable: true, climb: true },
  { name: 'Scaffold', hardness: 0.25, solid: true, drop: 'scaffold' },
];

export interface ItemDef {
  name: string;
  color: string;
  /** Tile placed when used as a block, or null. */
  places: number | null;
  /** Kit items stay in the pack when you bank at the base (crafted gear). */
  kit?: boolean;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  rust: { name: 'Rust', color: '#a8604a', places: T.RUST },
  metal: { name: 'Metal', color: '#8794a8', places: T.METAL },
  iron_scrap: { name: 'Iron scrap', color: '#d6c7b8', places: null },
  copper_wire: { name: 'Copper wire', color: '#e08a3c', places: null },
  torch: { name: 'Torch', color: '#ffb03a', places: T.TORCH, kit: true },
  ladder: { name: 'Ladder', color: '#c9a35a', places: T.LADDER, kit: true },
  scaffold: { name: 'Scaffold', color: '#7d8da6', places: T.SCAFFOLD, kit: true },
};

export const PLACEABLE: ItemId[] = ['rust', 'metal', 'torch', 'ladder', 'scaffold'];

/** Placeables worth showing in the hotbar: owned ones plus the selected one, in PLACEABLE order. */
export function visiblePlaceables(inv: Inventory, selected: ItemId): ItemId[] {
  return PLACEABLE.filter((id) => id === selected || (inv[id] ?? 0) > 0);
}

export function isMinable(tile: number): boolean {
  const d = TILES[tile];
  return !!d && (d.solid || d.minable === true) && Number.isFinite(d.hardness);
}

export type Inventory = Partial<Record<ItemId, number>>;

export function invCount(inv: Inventory, id: ItemId): number {
  return inv[id] ?? 0;
}

export function invTotal(inv: Inventory): number {
  let n = 0;
  for (const id of ITEM_IDS) n += inv[id] ?? 0;
  return n;
}

export function invAdd(inv: Inventory, id: ItemId, n: number): void {
  inv[id] = (inv[id] ?? 0) + n;
}

export function canAfford(inv: Inventory, cost: Inventory): boolean {
  return ITEM_IDS.every((id) => (inv[id] ?? 0) >= (cost[id] ?? 0));
}

export function pay(inv: Inventory, cost: Inventory): void {
  for (const id of ITEM_IDS) {
    const c = cost[id] ?? 0;
    if (c > 0) inv[id] = (inv[id] ?? 0) - c;
  }
}
