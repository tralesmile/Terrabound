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
  | 'bait'
  | 'hut_kit'
  | 'gravel'
  | 'charge'
  | 'pepper_seed'
  | 'ashpepper'
  | 'curry'
  | 'aquarium'
  | 'hare_meat'
  | 'prime_meat'
  | 'lunker'
  | 'medkit'
  | 'beacon_colossus'
  | 'beacon_vine'
  | 'beacon_golem'
  | 'beacon_wyrm'
  | 'beacon_titan'
  | 'beacon_warden'
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
  | 'drone'
  | 'turret'
  | 'spikes'
  | 'reinforced'
  | 'shield'
  | 'table'
  | 'lamp'
  | 'screen'
  | 'potplant'
  | 'banner'
  | 'bed'
  | 'chair'
  | 'window'
  | 'panel'
  | 'wall_panel'
  | 'wall_brick'
  | 'wall_stripe'
  | 'hazard'
  | 'brick'
  | 'grate'
  | 'neon_cyan'
  | 'neon_pink'
  | 'lift'
  | 'corn_seed'
  | 'root_seed'
  | 'berry_seed'
  | 'glowcorn'
  | 'rustroot'
  | 'frostberry'
  | 'sprinkler'
  | 'pot'
  | 'garage_kit'
  | 'chowder'
  | 'stew'
  | 'tart'
  | 'icefin'
  | 'jump_pad';
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
  'bait',
  'hut_kit',
  'gravel',
  'charge',
  'pepper_seed',
  'ashpepper',
  'curry',
  'aquarium',
  'hare_meat',
  'prime_meat',
  'lunker',
  'medkit',
  'beacon_colossus',
  'beacon_vine',
  'beacon_golem',
  'beacon_wyrm',
  'beacon_titan',
  'beacon_warden',
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
  'turret',
  'spikes',
  'reinforced',
  'shield',
  'table',
  'lamp',
  'screen',
  'potplant',
  'banner',
  'bed',
  'chair',
  'window',
  'panel',
  'wall_panel',
  'wall_brick',
  'wall_stripe',
  'hazard',
  'brick',
  'grate',
  'neon_cyan',
  'neon_pink',
  'lift',
  'corn_seed',
  'root_seed',
  'berry_seed',
  'glowcorn',
  'rustroot',
  'frostberry',
  'sprinkler',
  'pot',
  'garage_kit',
  'chowder',
  'stew',
  'tart',
  'icefin',
  'jump_pad',
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
  /** Magma cooled by water: very hard, drops metal. */
  BASALT: 41,
  /** Raid defences (defences.ts): powered turret, floor spikes, reinforced wall. */
  TURRET: 42,
  SPIKES: 43,
  REINFORCED: 44,
  /** Raid blueprint: energy-laced wall, 6x chew time, glows. */
  SHIELD: 45,
  /** Furniture (rooms.ts): one tile each, non-solid, minable. A lamp lights like a torch. */
  TABLE: 46,
  LAMP: 47,
  SCREEN: 48,
  POT_PLANT: 49,
  BANNER: 50,
  BED: 51,
  /** Right halves of the 2-tile bed and table (wide.ts); placed and removed with their left half. */
  BED_FOOT: 52,
  TABLE_END: 53,
  CHAIR: 54,
  /** Glass window (solid, lets light through, shows the sky; a room wall with a view adds comfort). */
  WINDOW: 55,
  /** Lift shaft: climb tile that rides 3x ladder speed; closes rooms like a door. */
  LIFT: 56,
  /** Crops (farming.ts): sprout, growing, ripe for each kind. Non-solid, cut to harvest. */
  CORN_1: 57,
  CORN_2: 58,
  CORN_3: 59,
  ROOT_1: 60,
  ROOT_2: 61,
  ROOT_3: 62,
  BERRY_1: 63,
  BERRY_2: 64,
  BERRY_3: 65,
  /** Waters crops within 4 columns (farming.ts). */
  SPRINKLER: 66,
  /** Cooking pot: meal recipes in the workshop need one in the base. */
  POT: 67,
  /** Garage bay: build, upgrade and deploy vehicles (garage.ts). */
  GARAGE: 68,
  /** Frozen pond skin in the Frozen Spires: solid, see-through; the rod fishes through it. */
  ICE: 69,
  /** Spring pad: stepping on it launches the player high (a way up to sky islands). */
  JUMP_PAD: 70,
  /** Build set (solid decor blocks): smooth hull panel, hazard stripe, red brick, see-through grate, and two self-lit neon blocks. */
  PANEL: 71,
  HAZARD: 72,
  BRICK: 73,
  GRATE: 74,
  NEON_CYAN: 75,
  NEON_PINK: 76,
  /** Furrowed soil: planting a crop tills the ground under it. Crops on it grow faster and give one more produce. */
  TILLED: 77,
  /** Loose gravel: a placeable block that falls like sand (drop traps, plug pits, build slides). */
  GRAVEL: 78,
  /** Ashpepper (farming.ts): the fourth crop, from Ash Dunes grass. */
  PEPPER_1: 79,
  PEPPER_2: 80,
  PEPPER_3: 81,
  /** Aquarium: a see-through water tank block for bases (decor). */
  AQUARIUM: 82,
  /** Obsidian: magma quenched by water poured from above. Glassy, hard, dark, a prized building block. */
  OBSIDIAN: 83,
  /** Placed charge (charges.ts): inert until a blast or bolt lights it, then it chains to its neighbours. */
  CHARGE: 84,
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
  /** Solid but lets light through (windows). */
  clear?: boolean;
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
  { name: 'Cooled basalt', hardness: 2.4, solid: true, drop: 'metal' },
  { name: 'Turret', hardness: 0.6, solid: false, drop: 'turret', minable: true },
  { name: 'Spike trap', hardness: 0.4, solid: false, drop: 'spikes', minable: true },
  { name: 'Reinforced wall', hardness: 1.6, solid: true, drop: 'reinforced' },
  { name: 'Shield wall', hardness: 2, solid: true, drop: 'shield', glow: true },
  { name: 'Table', hardness: 0.2, solid: false, drop: 'table', minable: true },
  { name: 'Lamp', hardness: 0.1, solid: false, drop: 'lamp', minable: true },
  { name: 'Wall screen', hardness: 0.2, solid: false, drop: 'screen', minable: true },
  { name: 'Potted plant', hardness: 0.1, solid: false, drop: 'potplant', minable: true },
  { name: 'Banner', hardness: 0.1, solid: false, drop: 'banner', minable: true },
  { name: 'Bunk bed', hardness: 0.2, solid: false, drop: 'bed', minable: true },
  { name: 'Bunk bed', hardness: 0.2, solid: false, drop: 'bed', minable: true },
  { name: 'Table', hardness: 0.2, solid: false, drop: 'table', minable: true },
  { name: 'Chair', hardness: 0.1, solid: false, drop: 'chair', minable: true },
  { name: 'Window', hardness: 0.4, solid: true, drop: 'window', clear: true },
  { name: 'Lift shaft', hardness: 0.2, solid: false, drop: 'lift', minable: true, climb: true },
  // Crops drop through farming.ts harvestYield (ripe ones give produce and seeds).
  { name: 'Glowcorn sprout', hardness: 0.05, solid: false, drop: null, minable: true },
  { name: 'Glowcorn', hardness: 0.05, solid: false, drop: null, minable: true },
  { name: 'Ripe glowcorn', hardness: 0.05, solid: false, drop: null, minable: true, glow: true },
  { name: 'Rustroot sprout', hardness: 0.05, solid: false, drop: null, minable: true },
  { name: 'Rustroot', hardness: 0.05, solid: false, drop: null, minable: true },
  { name: 'Ripe rustroot', hardness: 0.05, solid: false, drop: null, minable: true },
  { name: 'Frostberry sprout', hardness: 0.05, solid: false, drop: null, minable: true },
  { name: 'Frostberry bush', hardness: 0.05, solid: false, drop: null, minable: true },
  { name: 'Ripe frostberry', hardness: 0.05, solid: false, drop: null, minable: true },
  { name: 'Sprinkler', hardness: 0.3, solid: false, drop: 'sprinkler', minable: true },
  { name: 'Cooking pot', hardness: 0.3, solid: false, drop: 'pot', minable: true },
  { name: 'Garage bay', hardness: 0.8, solid: false, drop: 'garage_kit', minable: true },
  { name: 'Pond ice', hardness: 0.4, solid: true, drop: null, clear: true },
  { name: 'Jump pad', hardness: 0.5, solid: true, drop: 'jump_pad' },
  { name: 'Hull panel', hardness: 0.7, solid: true, drop: 'panel' },
  { name: 'Hazard block', hardness: 0.7, solid: true, drop: 'hazard' },
  { name: 'Red brick', hardness: 0.7, solid: true, drop: 'brick' },
  { name: 'Grate', hardness: 0.4, solid: true, drop: 'grate', clear: true },
  { name: 'Cyan neon', hardness: 0.4, solid: true, drop: 'neon_cyan', glow: true },
  { name: 'Pink neon', hardness: 0.4, solid: true, drop: 'neon_pink', glow: true },
  { name: 'Tilled soil', hardness: 0.35, solid: true, drop: 'rust' },
  { name: 'Gravel', hardness: 0.3, solid: true, drop: 'gravel' },
  { name: 'Ashpepper sprout', hardness: 0.05, solid: false, drop: null, minable: true },
  { name: 'Ashpepper bush', hardness: 0.05, solid: false, drop: null, minable: true },
  { name: 'Ripe ashpepper', hardness: 0.05, solid: false, drop: null, minable: true },
  { name: 'Aquarium', hardness: 0.4, solid: true, drop: 'aquarium', clear: true },
  { name: 'Obsidian', hardness: 2.8, solid: true, drop: 'metal' },
  { name: 'Blast charge', hardness: 0.3, solid: true, drop: 'charge' },
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
  pepper_seed: { name: 'Ashpepper seed', color: '#ff7a3a', places: T.PEPPER_1, kit: true },
  ashpepper: { name: 'Ashpepper', color: '#ff5a2a', places: null },
  aquarium: { name: 'Aquarium', color: '#4aa6d8', places: T.AQUARIUM, kit: true },
  curry: { name: 'Ember curry', color: '#ff9a3a', places: null, kit: true },
  gravel: { name: 'Gravel', color: '#9a9488', places: T.GRAVEL, kit: true },
  charge: { name: 'Blast charge', color: '#ff6a3a', places: T.CHARGE, kit: true },
  hut_kit: { name: 'Hut kit', color: '#c9a35a', places: null, kit: true },
  bait: { name: 'Bait', color: '#c9a35a', places: null },
  hare_meat: { name: 'Hare meat', color: '#d89a7a', places: null },
  prime_meat: { name: 'Prime meat', color: '#e8826a', places: null },
  lunker: { name: 'Lunker', color: '#ffb03a', places: null },
  medkit: { name: 'Medkit', color: '#ff5a5a', places: null, kit: true },
  beacon_colossus: { name: 'Scrap beacon', color: '#c77a5e', places: null },
  beacon_vine: { name: 'Vine beacon', color: '#7fcf5a', places: null },
  beacon_golem: { name: 'Prism beacon', color: '#d8b8ff', places: null },
  beacon_wyrm: { name: 'Ember beacon', color: '#ff8a3c', places: null },
  beacon_titan: { name: 'Frost beacon', color: '#e6f6ff', places: null },
  beacon_warden: { name: 'Logic key', color: '#5aff9a', places: null },
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
  turret: { name: 'Turret', color: '#ff6a4a', places: T.TURRET, kit: true },
  spikes: { name: 'Spike trap', color: '#c9d0e4', places: T.SPIKES, kit: true },
  reinforced: { name: 'Reinforced wall', color: '#8a9ab8', places: T.REINFORCED, kit: true },
  shield: { name: 'Shield wall', color: '#5ad8ff', places: T.SHIELD, kit: true },
  table: { name: 'Table', color: '#a07a4a', places: T.TABLE, kit: true },
  lamp: { name: 'Lamp', color: '#ffe08a', places: T.LAMP, kit: true },
  screen: { name: 'Wall screen', color: '#36e0e8', places: T.SCREEN, kit: true },
  potplant: { name: 'Potted plant', color: '#5ac85a', places: T.POT_PLANT, kit: true },
  banner: { name: 'Banner', color: '#e04a5a', places: T.BANNER, kit: true },
  bed: { name: 'Bunk bed', color: '#6a8ad8', places: T.BED, kit: true },
  chair: { name: 'Chair', color: '#c9a35a', places: T.CHAIR, kit: true },
  window: { name: 'Window', color: '#9fd8ff', places: T.WINDOW, kit: true },
  lift: { name: 'Lift shaft', color: '#5ad8ff', places: T.LIFT, kit: true },
  // Crop seeds are kit (they stay in the pack to plant at home); produce is food and banks.
  corn_seed: { name: 'Glowcorn seed', color: '#ffe36a', places: T.CORN_1, kit: true },
  root_seed: { name: 'Rustroot seed', color: '#c77a5e', places: T.ROOT_1, kit: true },
  berry_seed: { name: 'Frostberry seed', color: '#8ad8ff', places: T.BERRY_1, kit: true },
  glowcorn: { name: 'Glowcorn', color: '#ffe36a', places: null },
  rustroot: { name: 'Rustroot', color: '#d8704a', places: null },
  frostberry: { name: 'Frostberry', color: '#7ac8ff', places: null },
  sprinkler: { name: 'Sprinkler', color: '#5aa6ff', places: T.SPRINKLER, kit: true },
  pot: { name: 'Cooking pot', color: '#8a9ab8', places: T.POT, kit: true },
  garage_kit: { name: 'Garage kit', color: '#e8a33d', places: T.GARAGE, kit: true },
  // Meals (cooked at a pot) are field food: they stay in the pack like medkits.
  chowder: { name: 'Corn chowder', color: '#ffe36a', places: null, kit: true },
  stew: { name: 'Root stew', color: '#d8704a', places: null, kit: true },
  tart: { name: 'Berry tart', color: '#7ac8ff', places: null, kit: true },
  icefin: { name: 'Icefin', color: '#bfe6f5', places: null },
  jump_pad: { name: 'Jump pad', color: '#36e0e8', places: T.JUMP_PAD, kit: true },
  wall_panel: { name: 'Panel wall', color: '#6f7d96', places: null, placesWall: 4, kit: true },
  wall_brick: { name: 'Brick wall', color: '#a8503c', places: null, placesWall: 5, kit: true },
  wall_stripe: { name: 'Stripe wall', color: '#e8b82a', places: null, placesWall: 6, kit: true },
  panel: { name: 'Hull panel', color: '#6f7d96', places: T.PANEL, kit: true },
  hazard: { name: 'Hazard block', color: '#e8b82a', places: T.HAZARD, kit: true },
  brick: { name: 'Red brick', color: '#a8503c', places: T.BRICK, kit: true },
  grate: { name: 'Grate', color: '#8a96a8', places: T.GRATE, kit: true },
  neon_cyan: { name: 'Cyan neon', color: '#36e0e8', places: T.NEON_CYAN, kit: true },
  neon_pink: { name: 'Pink neon', color: '#ff5ac8', places: T.NEON_PINK, kit: true },
};

export const PLACEABLE: ItemId[] = ['rust', 'metal', 'torch', 'ladder', 'scaffold', 'platform', 'door', 'wall', 'chest', 'seed', 'solar', 'smelter', 'battery', 'miner', 'drone', 'turret', 'spikes', 'reinforced', 'shield', 'table', 'lamp', 'screen', 'potplant', 'banner', 'bed', 'chair', 'window', 'lift', 'corn_seed', 'root_seed', 'berry_seed', 'sprinkler', 'pot', 'garage_kit', 'jump_pad', 'panel', 'hazard', 'brick', 'grate', 'neon_cyan', 'neon_pink', 'wall_panel', 'wall_brick', 'wall_stripe', 'hut_kit', 'gravel', 'charge', 'pepper_seed', 'aquarium'];

/**
 * Full build-bar order: the player's arranged order first (unknown and duplicate ids dropped),
 * then every other placeable in PLACEABLE order, so new placeables always have a place.
 */
export function hotbarOrder(order: readonly string[] = []): ItemId[] {
  const out: ItemId[] = [];
  for (const id of order) if ((PLACEABLE as string[]).includes(id) && !out.includes(id as ItemId)) out.push(id as ItemId);
  for (const id of PLACEABLE) if (!out.includes(id)) out.push(id);
  return out;
}

/** Placeables worth showing in the hotbar: owned ones plus the selected one, in the player's arranged order. */
export function visiblePlaceables(inv: Inventory, selected: ItemId, order: readonly string[] = []): ItemId[] {
  return hotbarOrder(order).filter((id) => id === selected || (inv[id] ?? 0) > 0);
}

/** Keys 6 7 8 9 0 - pick visible build-bar slots 0-5 (desktop). */
export const BAR_SLOT_KEYS = ['6', '7', '8', '9', '0', '-'] as const;

/** The item in visible build-bar slot `n` (0-based), or undefined when the bar is shorter. */
export function barSlotItem(inv: Inventory, selected: ItemId, order: readonly string[], n: number): ItemId | undefined {
  if (!Number.isInteger(n) || n < 0) return undefined;
  return visiblePlaceables(inv, selected, order)[n];
}

/**
 * Move `id` one slot left (dir -1) or right (+1) on the visible build bar: it swaps places with the
 * next shown item that way. Returns the new full order (unchanged when it is already at that end or not shown).
 */
export function moveInHotbar(order: readonly string[], inv: Inventory, selected: ItemId, id: ItemId, dir: -1 | 1): ItemId[] {
  const full = hotbarOrder(order);
  const shown = visiblePlaceables(inv, selected, full);
  const i = shown.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= shown.length) return full;
  const a = full.indexOf(id);
  const b = full.indexOf(shown[j]);
  full[a] = shown[j];
  full[b] = id;
  return full;
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
