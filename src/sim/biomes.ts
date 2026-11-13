/** Surface biomes: data table plus a pure, seeded column layout. Colours live in the renderer. */
import { hash2 } from './rng';
import { T } from './tiles';

export const B = { WASTES: 0, JUNGLE: 1, CRYSTAL: 2, ASH: 3, FROST: 4 } as const;
export type BiomeId = (typeof B)[keyof typeof B];
export const BIOME_IDS: BiomeId[] = [B.WASTES, B.JUNGLE, B.CRYSTAL, B.ASH, B.FROST];

export type TreeShape = 'wire' | 'canopy' | 'spire' | 'dead' | 'pine';

export interface BiomeDef {
  name: string;
  /** Crust tile in the top few rows. */
  crust: number;
  /** Surface roughness in tiles. */
  amp: number;
  tree: TreeShape;
  /** Chance per eligible column to start a tree. */
  treeChance: number;
  /** Chance per surface column to grow a plant. */
  plantChance: number;
  /** Extra crystal ore near the surface. */
  crystalNearSurface: boolean;
}

export const BIOMES: Record<BiomeId, BiomeDef> = {
  [B.WASTES]: { name: 'Rust Wastes', crust: T.RUST, amp: 7, tree: 'wire', treeChance: 0.05, plantChance: 0.18, crystalNearSurface: false },
  [B.JUNGLE]: { name: 'Overgrown Ruins', crust: T.SOIL, amp: 10, tree: 'canopy', treeChance: 0.22, plantChance: 0.6, crystalNearSurface: false },
  [B.CRYSTAL]: { name: 'Crystal Flats', crust: T.SAND, amp: 4, tree: 'spire', treeChance: 0.08, plantChance: 0.2, crystalNearSurface: true },
  [B.ASH]: { name: 'Ash Dunes', crust: T.ASH, amp: 9, tree: 'dead', treeChance: 0.06, plantChance: 0.08, crystalNearSurface: false },
  [B.FROST]: { name: 'Frozen Spires', crust: T.FROST, amp: 14, tree: 'pine', treeChance: 0.16, plantChance: 0.15, crystalNearSurface: false },
};

/** Half-width of the starting Rust Wastes around the pad. */
export const HOME_HALF = 150;

/**
 * Biome per column: Rust Wastes around the pad, then seeded bands of the other four biomes outward on
 * both sides (each 200-280 columns, 1.5x that in big worlds). Every biome appears at least once.
 */
/** Biome band width scale for a world `w` tiles wide: 1 up to 1400, 1.5 from 2400. */
export function bandScale(w: number): number {
  return w <= 1400 ? 1 : Math.min(1.5, 1 + ((w - 1400) / 1000) * 0.5);
}

export function biomeLayout(seed: number, w: number): Uint8Array {
  const out = new Uint8Array(w);
  const cx = Math.floor(w / 2);
  const others: BiomeId[] = [B.JUNGLE, B.CRYSTAL, B.ASH, B.FROST];
  // Seeded shuffle (Fisher-Yates with hash2).
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(hash2(i, 9, seed) * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const left = [others[0], others[2]];
  const right = [others[1], others[3]];
  const fill = (dir: -1 | 1, order: BiomeId[]): void => {
    let x = cx + dir * (HOME_HALF + 1);
    let k = 0;
    while (x >= 0 && x < w) {
      // Bigger worlds get grander biomes (a 1400-wide legacy world keeps its exact layout).
      const width = Math.round((200 + Math.floor(hash2(k, dir + 5, seed) * 80)) * bandScale(w));
      const id = order[k % order.length];
      for (let i = 0; i < width && x >= 0 && x < w; i++, x += dir) out[x] = id;
      k++;
    }
  };
  fill(-1, left);
  fill(1, right);
  for (let x = Math.max(0, cx - HOME_HALF); x <= Math.min(w - 1, cx + HOME_HALF); x++) out[x] = B.WASTES;
  return out;
}
