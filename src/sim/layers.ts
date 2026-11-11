/**
 * Depth layers below the surface. Each deeper layer is sealed by an energy gate that opens once enough
 * bosses are beaten, has its own rock and ore, and tougher enemies. Pure data and helpers.
 */
import { T } from './tiles';
import type { World } from './world';

export interface LayerDef {
  name: string;
  /** First row of the layer, in rows below the pad. */
  top: number;
  rock: number;
  ore: number;
  /** Bosses that must be beaten to open the gate at the top of this layer. */
  bosses: number;
  /** Enemy health multiplier. */
  enemyHp: number;
  /** Battery drain multiplier (heat). */
  heat: number;
}

export const LAYERS: LayerDef[] = [
  { name: 'Scrap layer', top: 0, rock: T.METAL, ore: T.IRON, bosses: 0, enemyHp: 1, heat: 1 },
  { name: 'Circuit layer', top: 90, rock: T.CIRCUIT, ore: T.CIRCUIT_ORE, bosses: 1, enemyHp: 1.6, heat: 1.2 },
  { name: 'Plasma layer', top: 180, rock: T.PLASMA_ROCK, ore: T.PLASMA_ORE, bosses: 3, enemyHp: 2.4, heat: 1.8 },
  { name: 'Core', top: 270, rock: T.CORE_ROCK, ore: T.CORE_ORE, bosses: 5, enemyHp: 3.4, heat: 2.2 },
];
export const GATE_ROWS = 2;

/** Layer index for a row (rows below the pad). */
export function layerAt(depth: number): number {
  let k = 0;
  for (let i = 0; i < LAYERS.length; i++) if (depth >= LAYERS[i].top) k = i;
  return k;
}

/** Seal every layer below the first with a full-width energy gate. */
export function placeGates(world: World): void {
  for (let k = 1; k < LAYERS.length; k++) {
    const y0 = world.padY + LAYERS[k].top;
    for (let y = y0; y < y0 + GATE_ROWS && y < world.h - 2; y++) for (let x = 1; x < world.w - 1; x++) world.tiles[y * world.w + x] = T.GATE;
  }
}

/** Open the gates of every layer whose boss requirement is met. Returns the number of layers opened. */
export function openGates(world: World, bossesBeaten: number): number {
  let opened = 0;
  for (let k = 1; k < LAYERS.length; k++) {
    if (bossesBeaten < LAYERS[k].bosses) continue;
    const y0 = world.padY + LAYERS[k].top;
    let any = false;
    for (let y = y0; y < y0 + GATE_ROWS && y < world.h - 2; y++) {
      for (let x = 1; x < world.w - 1; x++) {
        if (world.get(x, y) !== T.GATE) continue;
        world.set(x, y, LAYERS[k].rock);
        any = true;
      }
    }
    if (any) opened++;
  }
  return opened;
}
