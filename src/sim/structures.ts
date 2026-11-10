/**
 * World decoration after terrain: surface structures (ruins, towers, crashed ships), trees, plants,
 * underground vaults, crystal geodes and cave growth. Pure and seeded (hash2 only).
 */
import { hash2, valueNoise } from './rng';
import { BIOMES, type BiomeId, type TreeShape } from './biomes';
import { T, TILES } from './tiles';
import { W, type World } from './world';

/** Nothing is built this close to the pad (columns). */
export const PAD_CLEAR = 22;
/** Plants keep out of the base strip. */
export const PLANT_CLEAR = 9;

export type StructureKind = 'ruin' | 'tower' | 'ship' | 'vault' | 'geode' | 'shrine' | 'wreck';
export interface Structure {
  kind: StructureKind;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Structures are recorded on the world for tests, map pins and codex discovery. */
export function decorate(world: World): Structure[] {
  const out: Structure[] = [];
  const used = new Uint8Array(world.w);
  surfaceStructures(world, used, out);
  trees(world, used);
  plants(world);
  underground(world, out);
  (world as { structures: Structure[] }).structures = out;
  return out;
}

function solidAt(world: World, x: number, y: number): boolean {
  return TILES[world.get(x, y)].solid;
}

/** Set a tile only inside the world and away from bedrock borders. */
function put(world: World, x: number, y: number, t: number): void {
  if (x <= 0 || x >= world.w - 1 || y < 1 || y >= world.h - 2) return;
  world.set(x, y, t);
}

function putWall(world: World, x: number, y: number, wl: number): void {
  if (x <= 0 || x >= world.w - 1 || y < 1 || y >= world.h - 2) return;
  world.setWall(x, y, wl);
}

/** Flatten ground under [x0, x1] to row g: fill below with crust, clear above. */
function flatten(world: World, x0: number, x1: number, g: number, clear: number): void {
  for (let x = x0; x <= x1; x++) {
    const crust = BIOMES[world.biome[x] as BiomeId].crust;
    for (let y = g; y < g + 4; y++) {
      if (!solidAt(world, x, y)) put(world, x, y, crust);
      if (world.wall(x, y) === W.NONE) putWall(world, x, y, W.CAVE_RUST);
    }
    for (let y = g - clear; y < g; y++) {
      put(world, x, y, T.AIR);
      putWall(world, x, y, W.NONE);
    }
    world.surface[x] = g;
  }
}

function surfaceStructures(world: World, used: Uint8Array, out: Structure[]): void {
  const seed = world.seed ^ 0x57c7;
  const cx = world.padX;
  for (const dir of [-1, 1]) {
    // Structures extend rightward from x, so the left side starts one max width (22) further out.
    let x = cx + dir * (PAD_CLEAR + 8 + Math.floor(hash2(dir, 1, seed) * 20)) - (dir < 0 ? 22 : 0);
    let k = 0;
    while (x > 20 && x < world.w - 20) {
      const r = hash2(k, dir * 7, seed);
      const kind: StructureKind = r < 0.55 ? 'ruin' : r < 0.78 ? 'tower' : 'ship';
      const s = kind === 'ruin' ? ruin(world, x, k) : kind === 'tower' ? tower(world, x) : ship(world, x, dir);
      for (let c = s.x0 - 2; c <= s.x1 + 2; c++) if (c >= 0 && c < world.w) used[c] = 1;
      out.push(s);
      x += dir * (45 + Math.floor(hash2(k, dir * 3, seed) * 40) + (s.x1 - s.x0));
      k++;
    }
  }
}

function ruin(world: World, x0: number, k: number): Structure {
  const seed = world.seed ^ 0x2a1;
  const wdt = 8 + Math.floor(hash2(x0, 1, seed) * 7);
  const hgt = 5 + Math.floor(hash2(x0, 2, seed) * 5);
  const x1 = x0 + wdt - 1;
  const g = world.surface[x0 + (wdt >> 1)];
  flatten(world, x0 - 1, x1 + 1, g, hgt + 3);
  const top = g - hgt;
  // Collapse: one side of the roof and wall is missing on most ruins.
  const collapseRight = hash2(x0, 3, seed) < 0.5;
  for (let y = top; y < g; y++) {
    for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1 || y === top;
      const decay = hash2(x, y, seed + k);
      const broken = collapseRight ? x > x1 - 3 && y < top + 3 : x < x0 + 3 && y < top + 3;
      if (edge) {
        // Doorway at the bottom of the left wall.
        const door = x === x0 && y >= g - 2;
        if (!door && !broken && decay > 0.15) put(world, x, y, T.RUIN);
      } else if (decay > 0.18) putWall(world, x, y, W.PLATE);
    }
  }
  // Inner floor and loft.
  for (let x = x0; x <= x1; x++) put(world, x, g, T.RUIN);
  if (hgt >= 7) for (let x = x0 + 1; x < x1 - 1; x++) put(world, x, top + 3, T.PLATFORM);
  const chestX = x0 + 2 + Math.floor(hash2(x0, 4, seed) * (wdt - 4));
  put(world, chestX, g - 1, T.CHEST);
  return { kind: 'ruin', x0, y0: top, x1, y1: g };
}

function tower(world: World, x0: number): Structure {
  const seed = world.seed ^ 0x7077;
  const hgt = 10 + Math.floor(hash2(x0, 1, seed) * 6);
  const x1 = x0 + 4;
  const g = world.surface[x0 + 2];
  flatten(world, x0 - 1, x1 + 1, g, hgt + 3);
  const top = g - hgt;
  for (let y = top; y < g; y++) {
    put(world, x0, y, T.SCAFFOLD);
    put(world, x1, y, T.SCAFFOLD);
    put(world, x0 + 2, y, T.LADDER);
  }
  for (let x = x0 - 1; x <= x1 + 1; x++) put(world, x, top - 1, T.PLATFORM);
  put(world, x0 + 1, top - 2, T.CHEST);
  put(world, x0 + 3, top - 2, T.TORCH);
  return { kind: 'tower', x0: x0 - 1, y0: top - 2, x1: x1 + 1, y1: g };
}

function ship(world: World, xs: number, dir: number): Structure {
  const rx = 9;
  const ry = 3.6;
  const ccx = xs + rx;
  const g = world.surface[ccx];
  const ccy = g - 1;
  const x0 = ccx - rx - 1;
  const x1 = ccx + rx + 1;
  flatten(world, x0, x1, g, 7);
  for (let y = Math.floor(ccy - ry) - 1; y <= Math.ceil(ccy + ry) + 1; y++) {
    for (let x = x0; x <= x1; x++) {
      // Tilted hull: the nose dips into the ground.
      const tilt = ((x - ccx) / rx) * 1.4 * dir;
      const e = ((x - ccx) / rx) ** 2 + ((y - ccy - tilt) / ry) ** 2;
      if (e <= 1.0 && e > 0.55) put(world, x, y, T.METAL);
      else if (e <= 0.55) {
        put(world, x, y, T.AIR);
        putWall(world, x, y, W.PLATE);
      }
    }
  }
  // Breach in the tail so players can get in.
  const tailX = ccx - dir * (rx - 2);
  for (let y = ccy - 1; y <= ccy; y++) for (let x = tailX - 1; x <= tailX + 1; x++) put(world, x, y, T.AIR);
  // Chest on the floor inside.
  let cy = ccy;
  while (cy < ccy + 4 && !solidAt(world, ccx, cy + 1)) cy++;
  put(world, ccx, cy, T.CHEST);
  return { kind: 'ship', x0, y0: Math.floor(ccy - ry) - 1, x1, y1: Math.ceil(ccy + ry) + 2 };
}

function trees(world: World, used: Uint8Array): void {
  const seed = world.seed ^ 0x7ee5;
  let x = 3;
  while (x < world.w - 4) {
    const def = BIOMES[world.biome[x] as BiomeId];
    const s = world.surface[x];
    const ok =
      Math.abs(x - world.padX) > PAD_CLEAR - 6 &&
      !used[x] &&
      world.get(x, s) !== T.AIR &&
      solidAt(world, x, s) &&
      world.get(x, s - 1) === T.AIR &&
      world.surface[x - 1] >= s - 1 &&
      world.surface[x + 1] >= s - 1;
    if (ok && hash2(x, 1, seed) < def.treeChance) {
      tree(world, x, s, def.tree, hash2(x, 2, seed));
      x += 5 + Math.floor(hash2(x, 3, seed) * 4);
    } else x++;
  }
}

function leaf(world: World, x: number, y: number): void {
  if (world.get(x, y) === T.AIR) put(world, x, y, T.LEAVES);
}

function tree(world: World, x: number, s: number, shape: TreeShape, r: number): void {
  const range: Record<TreeShape, [number, number]> = {
    wire: [4, 7],
    canopy: [6, 11],
    spire: [3, 6],
    dead: [4, 8],
    pine: [6, 10],
  };
  const [lo, hi] = range[shape];
  const hgt = lo + Math.floor(r * (hi - lo + 1));
  const top = s - hgt;
  for (let y = top; y < s; y++) if (world.get(x, y) === T.AIR) put(world, x, y, T.TRUNK);
  switch (shape) {
    case 'canopy': {
      const rad = 2.6 + r * 1.2;
      for (let dy = -3; dy <= 2; dy++)
        for (let dx = -4; dx <= 4; dx++) if ((dx * dx) / (rad * rad) + (dy * dy) / ((rad * 0.75) ** 2) <= 1) leaf(world, x + dx, top + dy);
      break;
    }
    case 'pine':
      for (let i = 0; i < hgt - 2; i++) {
        const half = Math.floor((hgt - 2 - i) / 2.5);
        for (let dx = -half; dx <= half; dx++) leaf(world, x + dx, s - 2 - i);
      }
      leaf(world, x, top - 1);
      break;
    case 'spire':
      leaf(world, x, top - 1);
      leaf(world, x, top - 2);
      leaf(world, x - 1, top);
      leaf(world, x + 1, top);
      break;
    case 'wire':
      leaf(world, x - 1, top + 1);
      leaf(world, x + 1, top + 2);
      leaf(world, x, top - 1);
      break;
    case 'dead':
      if (world.get(x - 1, top + 2) === T.AIR) put(world, x - 1, top + 2, T.TRUNK);
      if (world.get(x + 1, top + 1) === T.AIR) put(world, x + 1, top + 1, T.TRUNK);
      break;
  }
}

function plants(world: World): void {
  const seed = world.seed ^ 0x9a7;
  for (let x = 1; x < world.w - 1; x++) {
    if (Math.abs(x - world.padX) <= PLANT_CLEAR) continue;
    const s = world.surface[x];
    if (world.get(x, s - 1) !== T.AIR || !solidAt(world, x, s)) continue;
    if (hash2(x, 5, seed) < BIOMES[world.biome[x] as BiomeId].plantChance) put(world, x, s - 1, T.PLANT);
  }
}

function underground(world: World, out: Structure[]): void {
  const seed = world.seed ^ 0xd00d;
  const padY = world.padY;
  // Cave growth: mushrooms on cave floors in seeded patches, glowing crystals on cave ceilings deeper down.
  for (let y = padY + 20; y < world.h - 4; y++) {
    for (let x = 2; x < world.w - 2; x++) {
      if (world.get(x, y) !== T.AIR) continue;
      if (solidAt(world, x, y + 1) && valueNoise(x / 40, y / 40, seed + 1) > 0.62 && hash2(x, y, seed) < 0.35) put(world, x, y, T.PLANT);
      else if (y > padY + 60 && solidAt(world, x, y - 1) && valueNoise(x / 35, y / 35, seed + 2) > 0.66 && hash2(x, y, seed + 3) < 0.25)
        put(world, x, y - 1, T.CRYSTAL);
    }
  }
  // Sealed vaults: dig in to loot them.
  const vaults = Math.floor(world.w / 110);
  for (let i = 0; i < vaults; i++) {
    const x0 = 8 + Math.floor(hash2(i, 1, seed) * (world.w - 24));
    const y0 = padY + 40 + Math.floor(hash2(i, 2, seed) * (world.h - padY - 80));
    if (Math.abs(x0 - world.padX) < PAD_CLEAR) continue;
    out.push(vault(world, x0, y0, i));
  }
  // Lore shrines: a data terminal on a ruin plinth in a cave.
  const shrines = Math.floor(world.w / 180);
  for (let i = 0; i < shrines; i++) {
    const at = caveFloor(world, 10 + Math.floor(hash2(i, 7, seed) * (world.w - 20)), padY + 40 + Math.floor(hash2(i, 8, seed) * (world.h - padY - 70)), seed + i * 31);
    if (!at) continue;
    const [x, y] = at;
    for (let dx = -1; dx <= 1; dx++) put(world, x + dx, y + 1, T.RUIN);
    put(world, x, y, T.TERMINAL);
    out.push({ kind: 'shrine', x0: x - 1, y0: y - 1, x1: x + 1, y1: y + 1 });
  }
  // Drone wrecks: a crashed survey drone half-buried in a cave floor.
  const wrecks = Math.floor(world.w / 120);
  for (let i = 0; i < wrecks; i++) {
    const at = caveFloor(world, 10 + Math.floor(hash2(i, 9, seed) * (world.w - 20)), padY + 30 + Math.floor(hash2(i, 10, seed) * (world.h - padY - 60)), seed + i * 37);
    if (!at) continue;
    const [x, y] = at;
    for (let dx = -1; dx <= 1; dx++) put(world, x + dx, y, T.WRECK);
    put(world, x, y - 1, T.WRECK);
    out.push({ kind: 'wreck', x0: x - 1, y0: y - 1, x1: x + 1, y1: y });
  }
  // Crystal geodes.
  const geodes = Math.floor(world.w / 140);
  for (let i = 0; i < geodes; i++) {
    const gx = 10 + Math.floor(hash2(i, 4, seed) * (world.w - 20));
    const gy = padY + 70 + Math.floor(hash2(i, 5, seed) * (world.h - padY - 100));
    const rad = 3 + Math.floor(hash2(i, 6, seed) * 3);
    for (let y = gy - rad - 1; y <= gy + rad + 1; y++) {
      for (let x = gx - rad - 1; x <= gx + rad + 1; x++) {
        const d = Math.hypot(x - gx, y - gy);
        if (d <= rad - 1) put(world, x, y, T.AIR);
        else if (d <= rad + 0.5) put(world, x, y, T.CRYSTAL);
      }
    }
    out.push({ kind: 'geode', x0: gx - rad, y0: gy - rad, x1: gx + rad, y1: gy + rad });
  }
}

/** A cave floor cell (air with solid ground below and 3 open rows above) near (x, y), or null. */
function caveFloor(world: World, x: number, y: number, seed: number): [number, number] | null {
  for (let k = 0; k < 40; k++) {
    const cx = x + Math.floor((hash2(k, 1, seed) - 0.5) * 60);
    const cy = y + Math.floor((hash2(k, 2, seed) - 0.5) * 40);
    if (cx < 4 || cx >= world.w - 4 || Math.abs(cx - world.padX) < PAD_CLEAR) continue;
    // Scan down from the sample point for the first cave floor.
    for (let yy = Math.max(world.padY + 25, cy); yy < Math.min(world.h - 4, cy + 50); yy++) {
      if (world.get(cx, yy) !== T.AIR || !solidAt(world, cx, yy + 1)) continue;
      if (world.get(cx, yy - 1) !== T.AIR || world.get(cx, yy - 2) !== T.AIR) continue;
      if (world.get(cx - 1, yy) !== T.AIR || world.get(cx + 1, yy) !== T.AIR) continue;
      return [cx, yy];
    }
  }
  return null;
}

function vault(world: World, x0: number, y0: number, i: number): Structure {
  const seed = world.seed ^ 0x7a17;
  const wdt = 11;
  const hgt = 7;
  const x1 = x0 + wdt - 1;
  const y1 = y0 + hgt - 1;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1 || y === y0 || y === y1;
      if (edge) put(world, x, y, T.RUIN);
      else {
        put(world, x, y, T.AIR);
        putWall(world, x, y, W.PLATE);
      }
    }
  }
  put(world, x0 + 3, y1 - 1, T.CHEST);
  if (hash2(i, 3, seed) < 0.5) put(world, x1 - 3, y1 - 1, T.CHEST);
  put(world, x0 + 5, y0 + 2, T.TORCH);
  return { kind: 'vault', x0, y0, x1, y1 };
}
