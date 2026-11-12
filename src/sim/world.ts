import { valueNoise, hash2 } from './rng';
import { T, TILES, type Inventory } from './tiles';
import { BIOMES, biomeLayout, type BiomeId } from './biomes';
import { decorate, type Structure } from './structures';
import { LAYERS, layerAt, placeGates } from './layers';

export const WORLD_W = 1400;
export const WORLD_H = 420;
/** Typical surface row (world-space y of the ground). */
export const SURFACE_ROW = 40;
export const PAD_HALF = 4;
/** Columns over which the terrain eases from the pad height into the natural surface. */
export const PAD_BLEND = 24;
export const TORCH_RADIUS = 7;
/** Enemies refuse to spawn where light exceeds this. */
export const SPAWN_LIGHT_MAX = 0.3;

/** Back-wall layer ids (separate from tiles; never solid). Natural cave walls are not minable. */
export const W = { NONE: 0, CAVE_RUST: 1, CAVE_ROCK: 2, PLATE: 3 } as const;
export const WALL_IDS = [W.NONE, W.CAVE_RUST, W.CAVE_ROCK, W.PLATE] as const;

export class World {
  readonly tiles: Uint8Array;
  /** Back walls behind tiles (W ids). Underground is lined with natural cave walls. */
  readonly walls: Uint8Array;
  /** Surface row (first solid row) per column, before digging. */
  readonly surface: Int16Array;
  /** Surface biome per column (B ids in biomes.ts). */
  readonly biome: Uint8Array;
  /** Tile column of the landing pad centre and the pad's row. */
  readonly padX: number;
  readonly padY: number;
  /** Tile indices (y * w + x) of every torch; kept in sync by set(). */
  readonly torches = new Set<number>();
  /** Points of interest placed by worldgen (ruins, towers, ships, vaults, geodes). */
  readonly structures: Structure[] = [];
  /** Growing saplings: tile index -> seconds until they become a tree. */
  readonly saplings = new Map<number, number>();
  /** Growing crops (farming.ts): tile index -> seconds left in the current stage. */
  readonly crops = new Map<number, number>();
  /** Chest contents by tile index (world chests appear here once opened; placed chests start empty). */
  readonly chests = new Map<number, Inventory>();
  /** Bumped when any chest's contents change (saves pick it up through the diff). */
  chestVersion = 0;
  /** Persistent edits since generation: index -> tile / wall (saved as a diff, see persist.ts). */
  readonly edits = new Map<number, number>();
  readonly wallEdits = new Map<number, number>();
  /** Tile indices changed since the renderer last looked (render caches drain this; capped). */
  readonly changes: number[] = [];
  /** Set when `changes` overflowed: caches must rebuild everything. */
  changesOverflow = false;
  /** Bumped on every tile or wall change so renderers can cache derived data (light map). */
  version = 0;

  constructor(
    readonly w: number,
    readonly h: number,
    readonly seed: number,
  ) {
    this.tiles = new Uint8Array(w * h);
    this.walls = new Uint8Array(w * h);
    this.surface = new Int16Array(w);
    this.biome = new Uint8Array(w);
    this.padX = Math.floor(w / 2);
    this.padY = 0;
  }

  get(x: number, y: number): number {
    if (x < 0 || x >= this.w) return T.BEDROCK;
    if (y < 0) return T.AIR;
    if (y >= this.h) return T.BEDROCK;
    return this.tiles[y * this.w + x];
  }

  set(x: number, y: number, t: number): boolean {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return false;
    const i = y * this.w + x;
    // Lamps (furniture) light like torches.
    if (this.tiles[i] === T.TORCH || this.tiles[i] === T.LAMP) this.torches.delete(i);
    if (t === T.TORCH || t === T.LAMP) this.torches.add(i);
    if (t !== T.SAPLING) this.saplings.delete(i);
    this.crops.delete(i); // a new stage (or anything else) restarts the stage timer; plantCrop / stepCrops set it
    if (t !== T.CHEST && this.chests.delete(i)) this.chestVersion++;
    this.tiles[i] = t;
    this.version++;
    this.mark(i);
    this.edits.set(i, t);
    return true;
  }

  wall(x: number, y: number): number {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return W.NONE;
    return this.walls[y * this.w + x];
  }

  setWall(x: number, y: number, wall: number): boolean {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return false;
    this.walls[y * this.w + x] = wall;
    this.version++;
    this.mark(y * this.w + x);
    this.wallEdits.set(y * this.w + x, wall);
    return true;
  }

  markChest(_x: number, _y: number): void {
    this.chestVersion++;
  }

  private mark(i: number): void {
    // Unbounded growth would leak if nothing drains it (tests, headless sims): past the cap, flag a full refresh.
    if (this.changes.length >= 4096) {
      this.changes.length = 0;
      this.changesOverflow = true;
    }
    this.changes.push(i);
  }

  isSolid(x: number, y: number): boolean {
    return TILES[this.get(x, y)].solid;
  }

  blocksEnemy(x: number, y: number): boolean {
    const d = TILES[this.get(x, y)];
    return d.solid || d.enemyBlock === true;
  }

  isOneWay(x: number, y: number): boolean {
    return TILES[this.get(x, y)].oneWay === true;
  }

  isClimb(x: number, y: number): boolean {
    return TILES[this.get(x, y)].climb === true;
  }

  /** Light 0..1 at a point from torches (linear falloff). */
  lightAt(x: number, y: number): number {
    let best = 0;
    for (const i of this.torches) {
      const tx = (i % this.w) + 0.5;
      const ty = Math.floor(i / this.w) + 0.5;
      const l = 1 - Math.hypot(x - tx, y - ty) / TORCH_RADIUS;
      if (l > best) best = l;
    }
    return best;
  }
}

export interface WorldStats {
  air: number;
  iron: number;
  copper: number;
}

/** Iron forms stretched seams; each large region of rock has its own seam angle (not round blobs). */
export function ironSeam(x: number, y: number, seed: number): boolean {
  const k = Math.min(SEAM_DIRS.length - 1, Math.floor(valueNoise(x / 60, y / 45, seed + 21) * SEAM_DIRS.length));
  const [c, sn] = SEAM_DIRS[k];
  return valueNoise((x * c + y * sn) / 8, (y * c - x * sn) / 2.4, seed + 2 + k) > IRON_CUT;
}
/** Seam directions (cos, sin): shallow left, flat, shallow right, steep. */
const SEAM_DIRS: [number, number][] = [-0.45, 0, 0.4, 1.1].map((a) => [Math.cos(a), Math.sin(a)]);

/** Copper runs in thin winding veins (a ridge of smooth noise), broken into lengths. */
export function copperVein(x: number, y: number, seed: number): boolean {
  return Math.abs(valueNoise(x / 9, y / 9, seed + 3) - 0.5) < COPPER_W && valueNoise(x / 4, y / 4, seed + 23) > 0.3;
}
const IRON_CUT = 0.761;
const COPPER_W = 0.027;

export function generateWorld(seed: number, w = WORLD_W, h = WORLD_H): World {
  const world = new World(w, h, seed);
  const cx = world.padX;
  const biome = biomeLayout(seed, w);
  world.biome.set(biome);

  // Surface roughness blends smoothly between biomes (box blur of the per-column amplitude).
  const amp = new Float32Array(w);
  const R = 18;
  for (let x = 0; x < w; x++) {
    let sum = 0;
    let n = 0;
    for (let k = -R; k <= R; k++) {
      const xx = x + k;
      if (xx < 0 || xx >= w) continue;
      sum += BIOMES[biome[xx] as BiomeId].amp;
      n++;
    }
    amp[x] = sum / n;
  }

  // Surface profile with a flat landing area in the middle.
  const raw: number[] = [];
  for (let x = 0; x < w; x++) {
    const a = amp[x];
    raw.push(
      Math.round(
        SURFACE_ROW + valueNoise(x / 22, 0.5, seed) * a + valueNoise(x / 7, 3.5, seed + 7) * a * 0.3 + valueNoise(x / 70, 8.5, seed + 13) * a * 0.8,
      ),
    );
  }
  const padRow = raw[cx];
  (world as { padY: number }).padY = padRow;
  // Flat landing area, then ease into the terrain so the spawn never sits next to a cliff.
  const flatHalf = PAD_HALF + 3;
  for (let x = 0; x < w; x++) {
    const k = Math.min(1, Math.max(0, (Math.abs(x - cx) - flatHalf) / PAD_BLEND));
    world.surface[x] = Math.max(6, Math.round(padRow + (raw[x] - padRow) * k * k));
  }

  for (let x = 0; x < w; x++) {
    const s = world.surface[x];
    const def = BIOMES[biome[x] as BiomeId];
    for (let y = s; y < h; y++) {
      const d = y - s;
      const i = y * w + x;
      const layer = LAYERS[layerAt(y - padRow)];
      let t: number = d < 4 + Math.floor(valueNoise(x / 5, y / 5, seed + 11) * 4) ? def.crust : layer.rock;
      world.walls[i] = t === T.METAL ? W.CAVE_ROCK : W.CAVE_RUST;

      // Caves: smooth noise above a threshold, only below a safe crust. Bigger caverns deeper down.
      if (d > 6 && y < h - 3) {
        const n = valueNoise(x / 9, y / 9, seed + 1);
        if (n > 0.7) t = T.AIR;
        else if (d > 10 && valueNoise(x / 4, y / 14, seed + 5) > 0.8) t = T.AIR;
        else if (d > 50 && valueNoise(x / 20, y / 12, seed + 19) > 0.74) t = T.AIR;
      }

      // Ores replace solid rock only.
      if (t !== T.AIR) {
        if (layer.ore !== T.IRON && valueNoise(x / 2.5, y / 2.5, seed + 9) > 0.8) t = layer.ore;
        else if (d > 4 && ironSeam(x, y, seed)) t = T.IRON;
        else if (d > 22 && copperVein(x, y, seed)) t = T.COPPER;
        else if (
          (def.crystalNearSurface && d > 2 && valueNoise(x / 3, y / 3, seed + 4) > 0.8) ||
          (d > 70 && valueNoise(x / 3, y / 3, seed + 4) > 0.86)
        )
          t = T.CRYSTAL;
      }

      // Bedrock border: floor and side walls.
      if (y >= h - 2 || x === 0 || x === w - 1) t = T.BEDROCK;
      world.tiles[i] = t;
    }
  }

  // Landing pad on the flat area.
  for (let x = cx - PAD_HALF; x <= cx + PAD_HALF; x++) world.set(x, padRow, T.PAD);
  // Small starter ore seam so run one is never empty.
  for (let i = 0; i < 3; i++) {
    const ox = cx - 6 + Math.floor(hash2(i, 1, seed) * 12);
    const oy = padRow + 6 + Math.floor(hash2(i, 2, seed) * 6);
    const t = world.get(ox, oy);
    if (t === T.RUST || t === T.METAL) world.set(ox, oy, T.IRON);
  }
  placeGates(world);
  decorate(world);
  world.version = 0;
  world.changes.length = 0;
  world.changesOverflow = false;
  world.edits.clear();
  world.wallEdits.clear();
  return world;
}

export function worldStats(world: World): WorldStats {
  let air = 0;
  let iron = 0;
  let copper = 0;
  for (let i = 0; i < world.tiles.length; i++) {
    const t = world.tiles[i];
    if (t === T.AIR) air++;
    else if (t === T.IRON) iron++;
    else if (t === T.COPPER) copper++;
  }
  return { air, iron, copper };
}
