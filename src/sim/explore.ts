/**
 * Exploration: fog-of-war map (per dive, coarse cells), codex discoveries (persistent, one-time rewards)
 * and the surface recall. Pure and deterministic.
 */
import { BIOMES, BIOME_IDS, type BiomeId } from './biomes';
import type { StructureKind } from './structures';
import type { Inventory } from './tiles';
import type { World } from './world';

/** Map cell size in tiles. */
export const CELL = 4;
/** Reveal radius in tiles around the player. */
export const REVEAL_R = 12;
/** Seconds of standing still on the surface to beam home. */
export const RECALL_TIME = 2.5;

export class FogMap {
  readonly cw: number;
  readonly ch: number;
  readonly seen: Uint8Array;
  /** Bumped whenever new cells are revealed (renderers cache on it). */
  version = 0;

  constructor(world: World) {
    this.cw = Math.ceil(world.w / CELL);
    this.ch = Math.ceil(world.h / CELL);
    this.seen = new Uint8Array(this.cw * this.ch);
  }

  reveal(x: number, y: number, r = REVEAL_R): number {
    let n = 0;
    const c0 = Math.max(0, Math.floor((x - r) / CELL));
    const c1 = Math.min(this.cw - 1, Math.floor((x + r) / CELL));
    const r0 = Math.max(0, Math.floor((y - r) / CELL));
    const r1 = Math.min(this.ch - 1, Math.floor((y + r) / CELL));
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        const i = cy * this.cw + cx;
        if (this.seen[i]) continue;
        if (Math.hypot(cx * CELL + CELL / 2 - x, cy * CELL + CELL / 2 - y) > r + CELL) continue;
        this.seen[i] = 1;
        n++;
      }
    }
    if (n > 0) this.version++;
    return n;
  }

  isSeen(tx: number, ty: number): boolean {
    const cx = Math.floor(tx / CELL);
    const cy = Math.floor(ty / CELL);
    if (cx < 0 || cy < 0 || cx >= this.cw || cy >= this.ch) return false;
    return this.seen[cy * this.cw + cx] === 1;
  }

  /** Reveal the whole sky band so the surface outline is always on the map (you can see the horizon). */
  revealSky(world: World): void {
    for (let x = 0; x < world.w; x += CELL) this.reveal(x + 2, world.surface[x] - 6, 6);
  }
}

export interface CodexEntry {
  id: string;
  name: string;
  reward: Inventory;
}

const POI_NAMES: Record<StructureKind, string> = {
  ruin: 'Collapsed ruin',
  tower: 'Radio tower',
  ship: 'Crashed ship',
  vault: 'Sealed vault',
  geode: 'Crystal geode',
};

const POI_REWARD: Record<StructureKind, Inventory> = {
  ruin: { iron_scrap: 4 },
  tower: { copper_wire: 3 },
  ship: { copper_wire: 4, iron_scrap: 4 },
  vault: { crystal: 3 },
  geode: { crystal: 4 },
};

/** Every discoverable entry: the five biomes and five kinds of point of interest. */
export const CODEX: CodexEntry[] = [
  ...BIOME_IDS.map((b) => ({ id: `biome:${b}`, name: BIOMES[b as BiomeId].name, reward: { crystal: 2, iron_scrap: 3 } as Inventory })),
  ...(Object.keys(POI_NAMES) as StructureKind[]).map((k) => ({ id: `poi:${k}`, name: POI_NAMES[k], reward: POI_REWARD[k] })),
];
export const CODEX_IDS = new Set(CODEX.map((c) => c.id));

export function codexEntry(id: string): CodexEntry | undefined {
  return CODEX.find((c) => c.id === id);
}

/** Codex ids the player is standing in right now (biome when on/near the surface, structures by bounds). */
export function discoveriesAt(world: World, x: number, y: number): string[] {
  const out: string[] = [];
  const tx = Math.floor(x);
  if (tx >= 0 && tx < world.w && y <= world.surface[tx] + 4) out.push(`biome:${world.biome[tx]}`);
  for (const s of world.structures) {
    if (x >= s.x0 - 1 && x <= s.x1 + 2 && y >= s.y0 - 1 && y <= s.y1 + 2) out.push(`poi:${s.kind}`);
  }
  return out;
}
