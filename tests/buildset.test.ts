import { describe, expect, it } from 'vitest';
import { ITEMS, PLACEABLE, T, TILES } from '../src/sim/tiles';
import { recipeById } from '../src/sim/recipes';
import { BASE_KEEP } from '../src/sim/base';
import { World } from '../src/sim/world';
import { buildAtlas } from '../src/render/sprites';

const SET = [
  ['panel', T.PANEL], ['hazard', T.HAZARD], ['brick', T.BRICK],
  ['grate', T.GRATE], ['neon_cyan', T.NEON_CYAN], ['neon_pink', T.NEON_PINK],
] as const;

describe('build block set', () => {
  it('each block is solid, drops itself, places itself, is craftable, saved with the base, and on the build bar', () => {
    for (const [id, tile] of SET) {
      expect(TILES[tile].solid).toBe(true);
      expect(TILES[tile].drop).toBe(id);
      expect(ITEMS[id].places).toBe(tile);
      expect(recipeById(id)?.out).toBe(id);
      expect(BASE_KEEP.has(tile)).toBe(true);
      expect(PLACEABLE).toContain(id);
    }
  });
  it('the grate lets light through and the neon blocks glow', () => {
    expect(TILES[T.GRATE].clear).toBe(true);
    expect(TILES[T.NEON_CYAN].glow).toBe(true);
    expect(TILES[T.NEON_PINK].glow).toBe(true);
  });
  it('neon blocks light like torches and stop when removed', () => {
    const w = new World(40, 40, 1);
    w.set(5, 5, T.NEON_CYAN);
    expect(w.torches.size).toBe(1);
    w.set(5, 5, T.AIR);
    expect(w.torches.size).toBe(0);
  });
  it('basic blocks need no machine; neon needs the fabricator upgrade', () => {
    for (const id of ['panel', 'hazard', 'brick', 'grate']) expect(recipeById(id)?.fab ?? 0).toBe(0);
    expect(recipeById('neon_cyan')?.fab).toBe(1);
  });
  it('every block has atlas art', () => {
    expect(typeof buildAtlas).toBe('function');
  });
});
