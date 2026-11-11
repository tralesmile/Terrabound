import { describe, expect, it } from 'vitest';
import { coolMagma, flowLiquids, isLiquid } from '../src/sim/liquids';
import { T, TILES } from '../src/sim/tiles';
import { World } from '../src/sim/world';

function box(w = 30, h = 20): World {
  const wl = new World(w, h, 1);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) wl.tiles[y * w + x] = x === 0 || x === w - 1 || y >= h - 2 ? T.BEDROCK : T.AIR;
  return wl;
}
const count = (w: World, t: number): number => w.tiles.reduce((a, v) => a + (v === t ? 1 : 0), 0);

describe('water cools magma into basalt', () => {
  it('basalt is a solid, minable, non-liquid block', () => {
    const d = TILES[T.BASALT];
    expect(d.solid).toBe(true);
    expect(isLiquid(T.BASALT)).toBe(false);
    expect(Number.isFinite(d.hardness)).toBe(true);
    expect(d.drop).toBe('metal');
  });
  it('touching cells react: magma becomes basalt, the water flashes to steam', () => {
    const w = box();
    w.set(10, 17, T.MAGMA);
    w.set(11, 17, T.WATER);
    const out = coolMagma(w, 15, 10);
    expect(out).toEqual([{ x: 10, y: 17 }]);
    expect(w.get(10, 17)).toBe(T.BASALT);
    expect(w.get(11, 17)).toBe(T.AIR);
  });
  it('magma and water apart do nothing', () => {
    const w = box();
    w.set(5, 17, T.MAGMA);
    w.set(20, 17, T.WATER);
    expect(coolMagma(w, 15, 10)).toEqual([]);
    expect(w.get(5, 17)).toBe(T.MAGMA);
  });
  it('water poured on a magma pool crusts it over and the flow settles', () => {
    const w = box();
    for (let x = 1; x < 29; x++) w.set(x, 17, T.MAGMA);
    for (let x = 10; x < 14; x++) for (let y = 3; y < 8; y++) w.set(x, y, T.WATER);
    const water0 = count(w, T.WATER);
    let cooled = 0;
    for (let tick = 0; tick < 300; tick++) {
      flowLiquids(w, 15, 10, tick);
      cooled += coolMagma(w, 15, 10).length;
    }
    expect(cooled).toBeGreaterThan(0);
    expect(count(w, T.BASALT)).toBe(cooled);
    // Every cooled cell used up at least one water cell, and no magma touches water afterwards.
    expect(count(w, T.WATER)).toBeLessThanOrEqual(water0 - cooled);
    for (let x = 1; x < 29; x++) if (w.get(x, 17) === T.MAGMA) expect(w.get(x, 16)).not.toBe(T.WATER);
    expect(coolMagma(w, 15, 10)).toEqual([]);
  });
  it('is deterministic', () => {
    const run = (): number[] => {
      const w = box();
      for (let x = 1; x < 29; x++) w.set(x, 17, T.MAGMA);
      for (let x = 8; x < 12; x++) w.set(x, 4, T.WATER);
      for (let tick = 0; tick < 100; tick++) {
        flowLiquids(w, 15, 10, tick);
        coolMagma(w, 15, 10);
      }
      return Array.from(w.tiles);
    };
    expect(run()).toEqual(run());
  });
});
