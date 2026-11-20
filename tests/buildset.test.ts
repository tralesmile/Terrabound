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

import { Game } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { W, WALL_ITEM, isBuiltWall } from '../src/sim/world';
import { sanitizeWalls } from '../src/sim/base';
import { invAdd, invCount } from '../src/sim/tiles';

describe('styled back walls', () => {
  it('built walls are the plate plus three styles; cave walls are not built', () => {
    expect([W.PLATE, W.PANEL, W.BRICK, W.STRIPE].every(isBuiltWall)).toBe(true);
    expect(isBuiltWall(W.NONE) || isBuiltWall(W.CAVE_RUST) || isBuiltWall(W.CAVE_ROCK)).toBe(false);
    for (const [id, item] of [[W.PANEL, 'wall_panel'], [W.BRICK, 'wall_brick'], [W.STRIPE, 'wall_stripe']] as const) {
      expect(ITEMS[item].placesWall).toBe(id);
      expect(WALL_ITEM[id]).toBe(item);
      expect(recipeById(item)?.out).toBe(item);
    }
  });
  it('they persist in the base save and unknown wall ids are dropped', () => {
    const t = [1, 1, W.PANEL, 2, 1, W.BRICK, 3, 1, W.STRIPE, 4, 1, 99];
    expect(sanitizeWalls(t)).toEqual([1, 1, W.PANEL, 2, 1, W.BRICK, 3, 1, W.STRIPE]);
  });
  it('a built wall can be repainted in another style, but not in its own', () => {
    const g = new Game(defaultSave(11));
    const x = g.world.padX + 3;
    const y = g.world.padY - 2;
    g.world.setWall(x, y, W.PLATE);
    expect(g.canPlaceWall(x, y, W.PLATE)).toBe(false);
    expect(g.canPlaceWall(x, y, W.BRICK)).toBe(true);
    // A styled wall also counts as a neighbour for lining out more wall.
    g.world.setWall(x, y - 5, W.BRICK);
    expect(g.canPlaceWall(x, y - 6, W.PANEL)).toBe(true);
  });
  it('mining a styled wall returns its own kit item', () => {
    const g = new Game(defaultSave(12));
    invAdd(g.carried, 'wall_stripe', 0);
    expect(invCount(g.carried, 'wall_stripe')).toBe(0);
    expect(WALL_ITEM[W.STRIPE]).toBe('wall_stripe');
  });
});
