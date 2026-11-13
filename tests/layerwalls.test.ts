import { describe, expect, it } from 'vitest';
import { LAYER_WALL_LOOK, WALL_KINDS, WALL_ROWS, TILE_COLORS, wallRow, wallTexture } from '../src/render/sprites';
import { LAYERS } from '../src/sim/layers';
import { W } from '../src/sim/world';

const lum = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
};
const avgLum = (px: (string | null)[]): number => {
  const cs = px.filter((c): c is string => !!c);
  return cs.reduce((a, c) => a + lum(c), 0) / cs.length;
};

describe('per-layer cave back walls', () => {
  it('the Scrap layer and the surface keep the original walls', () => {
    expect(wallRow(W.CAVE_RUST, 0)).toBe(W.CAVE_RUST);
    expect(wallRow(W.CAVE_ROCK, 0)).toBe(W.CAVE_ROCK);
  });

  it('deeper layers map both natural walls to that layer row; plates never change', () => {
    for (let k = 1; k < LAYERS.length; k++) {
      expect(wallRow(W.CAVE_RUST, k)).toBe(WALL_KINDS + k - 1);
      expect(wallRow(W.CAVE_ROCK, k)).toBe(WALL_KINDS + k - 1);
      expect(wallRow(W.PLATE, k)).toBe(W.PLATE);
      expect(wallRow(W.NONE, k)).toBe(W.NONE);
    }
    expect(WALL_ROWS).toBe(WALL_KINDS + LAYERS.length - 1);
  });

  it('every deeper wall is much darker than its layer rock, so open caves never read brighter than blocks', () => {
    for (let k = 1; k < LAYERS.length; k++) {
      const wall = avgLum(wallTexture(wallRow(W.CAVE_ROCK, k), 0));
      const rock = lum(TILE_COLORS[LAYERS[k].rock]);
      expect(wall).toBeLessThan(rock * 0.6);
      expect(LAYER_WALL_LOOK[k]).toBeTruthy();
    }
  });

  it('layer walls are fully opaque and vary across variants', () => {
    for (let k = 1; k < LAYERS.length; k++) {
      const a = wallTexture(WALL_KINDS + k - 1, 0);
      const b = wallTexture(WALL_KINDS + k - 1, 1);
      expect(a.every((c) => !!c)).toBe(true);
      expect(a.join()).not.toBe(b.join());
    }
  });
});
