import { valueNoise, hash2 } from './rng';
import { T, TILES } from './tiles';

export const WORLD_W = 160;
export const WORLD_H = 260;
export const PAD_HALF = 4;
export const TORCH_RADIUS = 7;
/** Enemies refuse to spawn where light exceeds this. */
export const SPAWN_LIGHT_MAX = 0.3;

export class World {
  readonly tiles: Uint8Array;
  /** Surface row (first solid row) per column, before digging. */
  readonly surface: Int16Array;
  /** Tile column of the landing pad centre and the pad's row. */
  readonly padX: number;
  readonly padY: number;
  /** Tile indices (y * w + x) of every torch; kept in sync by set(). */
  readonly torches = new Set<number>();

  constructor(
    readonly w: number,
    readonly h: number,
    readonly seed: number,
  ) {
    this.tiles = new Uint8Array(w * h);
    this.surface = new Int16Array(w);
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
    if (this.tiles[i] === T.TORCH) this.torches.delete(i);
    if (t === T.TORCH) this.torches.add(i);
    this.tiles[i] = t;
    return true;
  }

  isSolid(x: number, y: number): boolean {
    return TILES[this.get(x, y)].solid;
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

export function generateWorld(seed: number, w = WORLD_W, h = WORLD_H): World {
  const world = new World(w, h, seed);
  const cx = world.padX;

  // Surface profile with a flat landing area in the middle.
  const raw: number[] = [];
  for (let x = 0; x < w; x++) {
    raw.push(Math.round(30 + valueNoise(x / 18, 0.5, seed) * 7 + valueNoise(x / 6, 3.5, seed + 7) * 2.5));
  }
  const padRow = raw[cx];
  (world as { padY: number }).padY = padRow;
  for (let x = 0; x < w; x++) {
    const flat = Math.abs(x - cx) <= PAD_HALF + 3;
    world.surface[x] = flat ? padRow : raw[x];
  }

  for (let x = 0; x < w; x++) {
    const s = world.surface[x];
    for (let y = s; y < h; y++) {
      const d = y - s;
      let t: number = d < 4 + Math.floor(valueNoise(x / 5, y / 5, seed + 11) * 4) ? T.RUST : T.METAL;

      // Caves: smooth noise above a threshold, only below a safe crust.
      if (d > 6 && y < h - 3) {
        const n = valueNoise(x / 9, y / 9, seed + 1);
        const tunnel = valueNoise(x / 4, y / 14, seed + 5);
        if (n > 0.7 || (tunnel > 0.8 && d > 10)) t = T.AIR;
      }

      // Ores replace solid rock only.
      if (t !== T.AIR) {
        if (d > 4 && valueNoise(x / 2.5, y / 2.5, seed + 2) > 0.76) t = T.IRON;
        else if (d > 22 && valueNoise(x / 2.5, y / 2.5, seed + 3) > 0.82) t = T.COPPER;
      }

      // Bedrock border: floor and side walls.
      if (y >= h - 2 || x === 0 || x === w - 1) t = T.BEDROCK;
      world.tiles[y * w + x] = t;
    }
  }

  // Landing pad on the flat area.
  for (let x = cx - PAD_HALF; x <= cx + PAD_HALF; x++) world.set(x, padRow, T.PAD);
  // Guarantee a breathable pocket above the pad and a small starter ore seam so run one is never empty.
  for (let i = 0; i < 3; i++) {
    const ox = cx - 6 + Math.floor(hash2(i, 1, seed) * 12);
    const oy = padRow + 6 + Math.floor(hash2(i, 2, seed) * 6);
    if (world.get(ox, oy) === T.RUST || world.get(ox, oy) === T.METAL) world.set(ox, oy, T.IRON);
  }
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
