/**
 * Cave rim light (Core Keeper style): solid tile faces that border lit, non-sky air get a thin
 * warm highlight, strongest on faces turned toward the player's lamp. Pure (no DOM) so it is testable;
 * the renderer draws the result over the darkness pass so caves read in 3D.
 */
import { brightness, isSky, levelAt, type LightGrid, type LightWorld } from './lightmap';
import { TILES } from '../sim/tiles';

/** Face of a tile: 0 top, 1 right, 2 bottom, 3 left. */
export type Side = 0 | 1 | 2 | 3;

export interface Rim {
  x: number;
  y: number;
  side: Side;
  alpha: number;
  /** True when the face continues into the neighbour before / after it (no corner, so no inset there). */
  joinA: boolean;
  joinB: boolean;
}

const NX = [0, 1, 0, -1];
const NY = [-1, 0, 1, 0];
/** Faces dimmer than this are skipped (keeps the draw list short and the dark truly dark). */
export const RIM_MIN = 0.03;
/** Upper bound for any highlight, so the rim never outshines the tile itself. */
export const RIM_MAX = 0.48;

function rimSolid(t: number): boolean {
  const d = TILES[t];
  return !!d?.solid && !d.clear;
}

/**
 * Alpha for one face. `light` is the brightness of the air cell the face looks into,
 * `dot` the cosine between the face normal and the direction to the lamp (-1..1).
 * Top faces get a little extra (light seems to come from above), faces turned away get almost none.
 */
export function rimAlpha(light: number, dot: number, side: Side): number {
  const facing = Math.max(0, dot);
  const base = side === 0 ? 0.14 : 0.04;
  return Math.min(RIM_MAX, light * (base + 0.38 * facing));
}

/** Rims for every solid tile in [x0, x0+w) x [y0, y0+h) that faces lit cave air. */
export function computeRims(
  world: LightWorld,
  grid: LightGrid,
  x0: number,
  y0: number,
  w: number,
  h: number,
  lampX: number,
  lampY: number,
): Rim[] {
  const out: Rim[] = [];
  for (let y = Math.max(0, y0); y < Math.min(world.h, y0 + h); y++) {
    for (let x = Math.max(0, x0); x < Math.min(world.w, x0 + w); x++) {
      if (!rimSolid(world.get(x, y))) continue;
      for (let s = 0; s < 4; s++) {
        const ax = x + NX[s];
        const ay = y + NY[s];
        if (ax < 0 || ax >= world.w || ay < 0 || ay >= world.h) continue;
        const at = world.get(ax, ay);
        if (TILES[at]?.solid || TILES[at]?.liquid) continue;
        if (isSky(world, ax, ay)) continue; // open surface is already lit evenly
        const light = brightness(levelAt(grid, ax, ay));
        if (light <= 0) continue;
        // Direction from the face centre to the lamp.
        const fx = x + 0.5 + NX[s] * 0.5;
        const fy = y + 0.5 + NY[s] * 0.5;
        const dx = lampX - fx;
        const dy = lampY - fy;
        const len = Math.hypot(dx, dy) || 1;
        const dot = (dx * NX[s] + dy * NY[s]) / len;
        const alpha = rimAlpha(light, dot, s as Side);
        if (alpha < RIM_MIN) continue;
        // Along the face: before = left/up neighbour, after = right/down neighbour.
        const ux = NY[s] !== 0 ? 1 : 0;
        const uy = NY[s] !== 0 ? 0 : 1;
        const joins = (k: number): boolean => {
          const bx = x + ux * k;
          const by = y + uy * k;
          return rimSolid(world.get(bx, by)) && !TILES[world.get(bx + NX[s], by + NY[s])]?.solid;
        };
        out.push({ x, y, side: s as Side, alpha, joinA: joins(-1), joinB: joins(1) });
      }
    }
  }
  return out;
}

/** Rim colour per depth layer: warm lamp light in the Scrap layer, then each deep layer's own glow (circuit green, plasma pink, core violet). */
export const LAYER_RIM: readonly (readonly [number, number, number])[] = [
  [255, 228, 184],
  [170, 255, 200],
  [255, 160, 214],
  [208, 170, 255],
];

export function rimColor(layer: number): readonly [number, number, number] {
  return LAYER_RIM[Math.max(0, Math.min(LAYER_RIM.length - 1, Math.floor(layer)))];
}

/**
 * Soft floor glow for a lit top face in a deep layer: alphas for the art-pixel rows just below the edge,
 * fading into the block, so the walkable ledge reads in the dark layers. Scrap layer (0) and non-top faces get none.
 */
export function floorGlowBands(alpha: number, side: Side, layer: number): number[] {
  if (layer <= 0 || side !== 0 || alpha < RIM_MIN) return [];
  const out: number[] = [];
  for (const k of [0.6, 0.34, 0.16]) {
    const a = alpha * k;
    if (a >= 0.012) out.push(a);
  }
  return out;
}
