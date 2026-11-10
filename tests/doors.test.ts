import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { T, isMinable } from '../src/sim/tiles';
import { RECIPES } from '../src/sim/recipes';
import { captureBase, captureWalls, sanitizeBase, sanitizeWalls } from '../src/sim/base';
import { W } from '../src/sim/world';
import { enemyBoxHits, makeEnemy } from '../src/sim/enemies';

describe('doors and back walls', () => {
  it('are minable, craftable and non-solid for the player', () => {
    const g = new Game();
    for (const t of [T.DOOR, T.WALL]) {
      expect(isMinable(t)).toBe(true);
    }
    for (const id of ['door', 'wall']) expect(RECIPES.some((r) => r.id === id)).toBe(true);
    g.world.set(5, 5, T.DOOR);
    g.world.set(6, 5, T.WALL);
    expect(g.world.isSolid(5, 5)).toBe(false);
    expect(g.world.isSolid(6, 5)).toBe(false);
  });

  it('doors block enemies but walls do not', () => {
    const g = new Game();
    for (let y = 40; y < 44; y++) for (let x = 38; x < 43; x++) g.world.set(x, y, T.AIR);
    const e = makeEnemy(1, 'crawler', 40.5, 43);
    expect(enemyBoxHits(g.world, e)).toBe(false);
    g.world.set(40, 42, T.WALL);
    expect(enemyBoxHits(g.world, e)).toBe(false);
    g.world.set(40, 42, T.DOOR);
    expect(enemyBoxHits(g.world, e)).toBe(true);
  });

  it('survive base capture (doors as tiles, back walls in the wall layer)', () => {
    const g = new Game();
    const x = g.world.padX + 1;
    const y = g.world.padY - 2;
    g.world.set(x, y, T.DOOR);
    g.world.setWall(x + 1, y, W.PLATE);
    const flat = captureBase(g.world);
    expect(sanitizeBase(flat)).toEqual(flat);
    expect(flat).toEqual([1, 2, T.DOOR]);
    const walls = captureWalls(g.world);
    expect(walls).toEqual([2, 2, W.PLATE]);
    expect(sanitizeWalls(walls)).toEqual(walls);
  });
});
