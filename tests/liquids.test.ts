import { describe, expect, it } from 'vitest';
import { flowLiquids, isLiquid } from '../src/sim/liquids';
import { FIXED_DT, Game, NO_CONTROLS, SINK, type Controls } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';
import { World, generateWorld } from '../src/sim/world';
import { LAYERS } from '../src/sim/layers';

/** Empty test box: bedrock frame, air inside. */
function box(w = 30, h = 20): World {
  const wl = new World(w, h, 1);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) wl.tiles[y * w + x] = x === 0 || x === w - 1 || y >= h - 2 ? T.BEDROCK : T.AIR;
  return wl;
}
const count = (w: World, t: number): number => w.tiles.reduce((a, v) => a + (v === t ? 1 : 0), 0);

describe('liquid flow', () => {
  it('falls, spreads, levels out, conserves volume and then stops changing', () => {
    const w = box();
    for (let y = 2; y < 10; y++) for (let x = 5; x < 8; x++) w.set(x, y, T.WATER);
    const vol = count(w, T.WATER);
    let tick = 0;
    for (; tick < 400; tick++) {
      const moved = flowLiquids(w, 15, 10, tick);
      expect(count(w, T.WATER)).toBe(vol);
      if (moved === 0 && tick > 10) break;
    }
    expect(tick).toBeLessThan(400);
    // 24 cells over a 28-wide floor: a flat layer, no cell left hanging in the air.
    for (let x = 1; x < 29; x++) for (let y = 1; y < 17; y++) if (w.get(x, y) === T.WATER) expect(w.get(x, y + 1)).not.toBe(T.AIR);
    let maxH = 0;
    let minH = 99;
    for (let x = 1; x < 29; x++) {
      let hgt = 0;
      for (let y = 0; y < 18; y++) if (w.get(x, y) === T.WATER) hgt++;
      maxH = Math.max(maxH, hgt);
      minH = Math.min(minH, hgt);
    }
    expect(maxH - minH).toBeLessThanOrEqual(1);
  });

  it('drains into a hole dug below and never passes through solid', () => {
    const w = box();
    for (let x = 1; x < 29; x++) w.set(x, 10, T.METAL);
    for (let x = 5; x < 10; x++) w.set(x, 9, T.WATER);
    for (let t = 0; t < 50; t++) flowLiquids(w, 15, 10, t);
    expect(count(w, T.WATER)).toBe(5);
    for (let y = 11; y < 18; y++) for (let x = 1; x < 29; x++) expect(w.get(x, y)).not.toBe(T.WATER);
    w.set(6, 10, T.AIR);
    for (let t = 0; t < 200; t++) flowLiquids(w, 15, 10, t);
    let below = 0;
    for (let y = 11; y < 18; y++) for (let x = 1; x < 29; x++) if (w.get(x, y) === T.WATER) below++;
    expect(below).toBe(5);
  });

  it('only flows inside the window around the player', () => {
    const w = box(200, 20);
    w.set(150, 5, T.WATER);
    flowLiquids(w, 10, 10, 0, 20, 10);
    expect(w.get(150, 5)).toBe(T.WATER);
  });

  it('worldgen floods some cave basins with water and deep ones with acid', () => {
    let water = 0;
    let acid = 0;
    for (const seed of [1, 2, 3]) {
      const w = generateWorld(seed);
      water += count(w, T.WATER);
      acid += count(w, T.ACID_POOL);
      for (let x = w.padX - 20; x <= w.padX + 20; x++) for (let y = 0; y < w.padY + 15; y++) expect(isLiquid(w.get(x, y))).toBe(false);
    }
    expect(water).toBeGreaterThan(300);
    expect(acid).toBeGreaterThan(30);
  });

  it('worldgen pools magma only in the Plasma and Core layers', () => {
    let magma = 0;
    for (const seed of [1, 2]) {
      const w = generateWorld(seed);
      for (let y = 0; y < w.h; y++) {
        for (let x = 0; x < w.w; x++) {
          if (w.get(x, y) !== T.MAGMA) continue;
          magma++;
          expect(y - w.padY).toBeGreaterThanOrEqual(LAYERS[2].top);
        }
      }
      // No water or acid down there: the hot layers trade them for magma.
      for (let y = w.padY + LAYERS[2].top; y < w.h; y++) for (let x = 0; x < w.w; x++) expect(w.get(x, y) === T.WATER || w.get(x, y) === T.ACID_POOL).toBe(false);
    }
    expect(magma).toBeGreaterThan(50);
  });
});

describe('swimming', () => {
  const pool = (g: Game, t: number): number => {
    const x = g.world.padX + 60;
    const y = g.world.padY + 40;
    for (let yy = y - 12; yy <= y; yy++) for (let xx = x - 3; xx <= x + 3; xx++) g.world.set(xx, yy, Math.abs(xx - x) === 3 || yy === y ? T.METAL : yy > y - 8 ? t : T.AIR);
    g.body.x = x + 0.5;
    g.body.y = y - 3;
    g.body.vx = g.body.vy = 0;
    return y;
  };
  const run = (g: Game, s: number, c: Partial<Controls> = {}): void => {
    for (let i = 0; i < Math.round(s / FIXED_DT); i++) g.step(FIXED_DT, { ...NO_CONTROLS, ...c });
  };

  it('water slows the fall and jump swims up', () => {
    const g = new Game(defaultSave());
    pool(g, T.WATER);
    run(g, 0.5);
    expect(g.inLiquid).toBe(T.WATER);
    expect(g.body.vy).toBeLessThanOrEqual(SINK + 1e-6);
    const y0 = g.body.y;
    run(g, 0.4, { jump: true });
    expect(g.body.y).toBeLessThan(y0 - 1);
  });

  it('a fast fall into water does no fall damage', () => {
    const g = new Game(defaultSave());
    const y = pool(g, T.WATER);
    // Start in the air pocket just above the surface (rows y-12..y-8), falling fast.
    g.body.y = y - 8.01;
    g.body.vy = 26;
    const hp = g.hp;
    run(g, 1.5);
    expect(g.hp).toBe(hp);
  });

  it('acid burns', () => {
    const g = new Game(defaultSave());
    pool(g, T.ACID_POOL);
    const hp = g.hp;
    run(g, 1);
    expect(g.inLiquid).toBe(T.ACID_POOL);
    expect(g.hp).toBeLessThan(hp - 10);
  });

  it('magma burns faster than acid', () => {
    const loss = (t: number): number => {
      const g = new Game(defaultSave());
      pool(g, t);
      const hp = g.hp;
      run(g, 0.5);
      expect(g.inLiquid).toBe(t);
      return hp - g.hp;
    };
    const acid = loss(T.ACID_POOL);
    const magma = loss(T.MAGMA);
    expect(acid).toBeGreaterThan(0);
    expect(magma).toBeGreaterThan(acid * 2);
  });

  it('magma flows like any liquid and conserves volume', () => {
    const w = box();
    for (let y = 2; y < 6; y++) for (let x = 5; x < 8; x++) w.set(x, y, T.MAGMA);
    const vol = count(w, T.MAGMA);
    for (let tick = 0; tick < 200; tick++) flowLiquids(w, 15, 10, tick);
    expect(count(w, T.MAGMA)).toBe(vol);
    for (let x = 1; x < 29; x++) for (let y = 1; y < 17; y++) if (w.get(x, y) === T.MAGMA) expect(w.get(x, y + 1)).not.toBe(T.AIR);
  });

  it('blocks can be placed into liquid to plug it', () => {
    const g = new Game(defaultSave());
    const y = pool(g, T.WATER);
    const x = Math.floor(g.body.x) + 1;
    g.carried = { rust: 5 };
    g.selectPlaceable(0);
    run(g, 0.05, { place: true, aim: { tx: x, ty: y - 1 } });
    expect(g.world.get(x, y - 1)).toBe(T.RUST);
  });
});

describe('leaving water', () => {
  it('holding jump at the surface leaps the player out', () => {
    const g = new Game(defaultSave());
    const x = g.world.padX + 60;
    const y = g.world.padY + 40;
    for (let yy = y - 12; yy <= y; yy++) for (let xx = x - 3; xx <= x + 3; xx++) g.world.set(xx, yy, Math.abs(xx - x) === 3 || yy === y ? T.METAL : yy > y - 4 ? T.WATER : T.AIR);
    g.body.x = x + 0.5;
    g.body.y = y;
    let minY = g.body.y;
    for (let i = 0; i < 90; i++) {
      g.step(FIXED_DT, { ...NO_CONTROLS, jump: true });
      minY = Math.min(minY, g.body.y);
    }
    // Water is 3 deep (rows y-3..y-1): the feet must clear a one-block ledge at the surface (top edge y-4).
    expect(minY).toBeLessThan(y - 4.2);
  });
});
