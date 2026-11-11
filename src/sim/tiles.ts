/** Static content tables: tiles and items. Add new content here first, then wire it into worldgen/crafting. */

export type ItemId =
  | 'rust'
  | 'metal'
  | 'iron_scrap'
  | 'copper_wire'
  | 'crystal'
  | 'biomass'
  | 'seed'
  | 'fish'
  | 'glowfish'
  | 'beacon_colossus'
  | 'beacon_vine'
  | 'beacon_golem'
  | 'beacon_wyrm'
  | 'beacon_titan'
  | 'beacon_ai'
  | 'circuit'
  | 'plasma'
  | 'core_shard'
  | 'torch'
  | 'ladder'
  | 'scaffold'
  | 'platform'
  | 'door'
  | 'wall'
  | 'chest'
  | 'solar'
  | 'smelter'
  | 'battery'
  | 'miner'
  | 'drone';
export const ITEM_IDS: ItemId[] = [
  'rust',
  'metal',
  'iron_scrap',
  'copper_wire',
  'crystal',
  'biomass',
  'seed',
  'fish',
  'glowfish',
  'beacon_colossus',
  'beacon_vine',
  'beacon_golem',
  'beacon_wyrm',
  'beacon_titan',
  'beacon_ai',
  'circuit',
  'plasma',
  'core_shard',
  'torch',
  'ladder',
  'scaffold',
  'platform',
  'door',
  'wall',
  'chest',
  'solar',
  'smelter',
  'battery',
  'miner',
  'drone',
];

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
  PLATFORM: 10,
  DOOR: 11,
  WALL: 12,
  /** Biome crusts: dig like rust and drop rust. */
  SOIL: 13,
  ASH: 14,
  FROST: 15,
  SAND: 16,
  CRYSTAL: 17,
  RUIN: 18,
  TRUNK: 19,
  LEAVES: 20,
  PLANT: 21,
  CHEST: 22,
  TERMINAL: 23,
  WRECK: 24,
  WATER: 25,
  ACID_POOL: 26,
  SOLAR: 27,
  SMELTER: 28,
  BATTERY: 29,
  MINER: 30,
  DRONE: 31,
  SAPLING: 32,
  CIRCUIT: 33,
  CIRCUIT_ORE: 34,
  PLASMA_ROCK: 35,
  PLASMA_ORE: 36,
  CORE_ROCK: 37,
  CORE_ORE: 38,
  GATE: 39,
  MAGMA: 40,
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
  /** Solid only from above: stand on it, jump up through it, press down to drop. */
  oneWay?: boolean;
  /** Player walks through, enemies cannot. */
  enemyBlock?: boolean;
  /** Emits a faint light (crystals). */
  glow?: boolean;
  /** Saplings need soil under them. */
  soil?: boolean;
  /** Flows (liquids.ts); swimmable; blocks placing only until displaced. */
  liquid?: boolean;
  /** Damage per second while swimming in it (acid, magma). */
  dps?: number;
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
  { name: 'Platform', hardness: 0.15, solid: false, drop: 'platform', minable: true, oneWay: true },
  { name: 'Door', hardness: 0.3, solid: false, drop: 'door', minable: true, enemyBlock: true },
  { name: 'Back wall', hardness: 0.2, solid: false, drop: 'wall', minable: true },
  { name: 'Overgrown soil', hardness: 0.35, solid: true, drop: 'rust' },
  { name: 'Ash', hardness: 0.3, solid: true, drop: 'rust' },
  { name: 'Frost crust', hardness: 0.45, solid: true, drop: 'rust' },
  { name: 'Crystal sand', hardness: 0.3, solid: true, drop: 'rust' },
  { name: 'Crystal', hardness: 1.4, solid: true, drop: 'crystal', glow: true },
  { name: 'Ruin brick', hardness: 1.0, solid: true, drop: 'metal' },
  { name: 'Tree trunk', hardness: 0.5, solid: false, drop: 'biomass', minable: true },
  { name: 'Leaves', hardness: 0.08, solid: false, drop: null, minable: true },
  { name: 'Plant', hardness: 0.05, solid: false, drop: 'biomass', minable: true },
  { name: 'Loot chest', hardness: 0.4, solid: false, drop: null, minable: true },
  { name: 'Data terminal', hardness: 0.6, solid: false, drop: null, minable: true, glow: true },
  { name: 'Drone wreck', hardness: 0.8, solid: true, drop: 'copper_wire' },
  { name: 'Coolant water', hardness: Infinity, solid: false, drop: null, liquid: true },
  { name: 'Acid pool', hardness: Infinity, solid: false, drop: null, liquid: true, glow: true, dps: 24 },
  { name: 'Solar cell', hardness: 0.4, solid: false, drop: 'solar', minable: true },
  { name: 'Smelter', hardness: 0.6, solid: false, drop: 'smelter', minable: true },
  { name: 'Battery', hardness: 0.5, solid: false, drop: 'battery', minable: true },
  { name: 'Miner rig', hardness: 0.6, solid: false, drop: 'miner', minable: true },
  { name: 'Drone bay', hardness: 0.6, solid: false, drop: 'drone', minable: true },
  { name: 'Sapling', hardness: 0.05, solid: false, drop: 'seed', minable: true },
  { name: 'Circuit rock', hardness: 1.2, solid: true, drop: 'metal' },
  { name: 'Gold circuit', hardness: 1.5, solid: true, drop: 'circuit', glow: true },
  { name: 'Plasma rock', hardness: 1.5, solid: true, drop: 'metal' },
  { name: 'Plasma cell', hardness: 1.8, solid: true, drop: 'plasma', glow: true },
  { name: 'Core rock', hardness: 1.9, solid: true, drop: 'metal' },
  { name: 'Core shard', hardness: 2.2, solid: true, drop: 'core_shard', glow: true },
  { name: 'Energy gate', hardness: Infinity, solid: true, drop: null },
  { name: 'Plasma magma', hardness: Infinity, solid: false, drop: null, liquid: true, glow: true, dps: 60 },
];

export interface ItemDef {
  name: string;
  color: string;
  /** Tile placed when used as a block, or null. */
  places: number | null;
  /** Kit items stay in the pack when you bank at the base (crafted gear). */
  kit?: boolean;
  /** Wall-layer id placed behind tiles instead of a tile (back walls). */
  placesWall?: number;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  rust: { name: 'Rust', color: '#a8604a', places: T.RUST },
  metal: { name: 'Metal', color: '#8794a8', places: T.METAL },
  iron_scrap: { name: 'Iron scrap', color: '#d6c7b8', places: null },
  copper_wire: { name: 'Copper wire', color: '#e08a3c', places: null },
  crystal: { name: 'Crystal', color: '#c08cff', places: null },
  biomass: { name: 'Biomass', color: '#7fcf5a', places: null },
  seed: { name: 'Tree seed', color: '#c9a35a', places: T.SAPLING },
  fish: { name: 'Hollow fish', color: '#5aa6ff', places: null },
  glowfish: { name: 'Glowfish', color: '#36e0e8', places: null },
  beacon_colossus: { name: 'Scrap beacon', color: '#c77a5e', places: null },
  beacon_vine: { name: 'Vine beacon', color: '#7fcf5a', places: null },
  beacon_golem: { name: 'Prism beacon', color: '#d8b8ff', places: null },
  beacon_wyrm: { name: 'Ember beacon', color: '#ff8a3c', places: null },
  beacon_titan: { name: 'Frost beacon', color: '#e6f6ff', places: null },
  beacon_ai: { name: 'Core key', color: '#ff5aff', places: null },
  circuit: { name: 'Gold circuit', color: '#ffcf4a', places: null },
  plasma: { name: 'Plasma cell', color: '#ff5a8a', places: null },
  core_shard: { name: 'Core shard', color: '#ff5aff', places: null },
  torch: { name: 'Torch', color: '#ffb03a', places: T.TORCH, kit: true },
  ladder: { name: 'Ladder', color: '#c9a35a', places: T.LADDER, kit: true },
  scaffold: { name: 'Scaffold', color: '#7d8da6', places: T.SCAFFOLD, kit: true },
  platform: { name: 'Platform', color: '#9fb0c8', places: T.PLATFORM, kit: true },
  door: { name: 'Door', color: '#6fa8c9', places: T.DOOR, kit: true },
  // 3 = W.PLATE (world.ts); kept numeric to avoid an import cycle.
  chest: { name: 'Storage chest', color: '#c9a35a', places: T.CHEST, kit: true },
  wall: { name: 'Back wall', color: '#5a6478', places: null, placesWall: 3, kit: true },
  solar: { name: 'Solar cell', color: '#4aa8ff', places: T.SOLAR, kit: true },
  smelter: { name: 'Smelter', color: '#ff8a3a', places: T.SMELTER, kit: true },
  battery: { name: 'Battery', color: '#7dff9a', places: T.BATTERY, kit: true },
  miner: { name: 'Miner rig', color: '#ffd23a', places: T.MINER, kit: true },
  drone: { name: 'Drone bay', color: '#8ad8ff', places: T.DRONE, kit: true },
};

export const PLACEABLE: ItemId[] = ['rust', 'metal', 'torch', 'ladder', 'scaffold', 'platform', 'door', 'wall', 'chest', 'seed', 'solar', 'smelter', 'battery', 'miner', 'drone'];

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
