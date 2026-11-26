import { describe, expect, it } from 'vitest';
import { FULL, PRESSURE_HEAD, flowLiquids, levelAt, volumeOf } from '../src/sim/liquids';
import { T } from '../src/sim/tiles';
import { World } from '../src/sim/world';

/** Solid block of bedrock to carve shapes out of. */
function rock(w = 20, h = 20): World {
  const wl = new World(w, h, 1);
  wl.tiles.fill(T.BEDROCK);
  return wl;
}
const carve = (w: World, x0: number, y0: number, x1: number, y1: number, t: number = T.AIR): void => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) w.set(x, y, t);
};
/** Height of the liquid surface in a column, in level units above row 20. */
function surface(w: World, x: number, t: number = T.WATER): number {
  for (let y = 0; y < w.h; y++) if (w.get(x, y) === t) return (w.h - 1 - y) * FULL + levelAt(w, x, y);
  return 0;
}
/** Two shafts (x 4-5 and x 10-11) joined by a tunnel along row 15, left shaft filled. */
function uBend(t: number = T.WATER): World {
  const w = rock();
  carve(w, 4, 4, 5, 15);
  carve(w, 10, 4, 11, 15);
  carve(w, 6, 15, 9, 15);
  carve(w, 4, 6, 5, 15, t);
  return w;
}
function run(w: World, ticks = 600): number {
  let t = 0;
  let still = 0;
  for (; t < ticks && still < 16; t++) still = flowLiquids(w, 10, 10, t) === 0 ? still + 1 : 0;
  return t;
}

describe('liquid pressure', () => {
  it('water climbs the far side of a U-bend until both surfaces match, then rests', () => {
    const w = uBend();
    const vol = volumeOf(w, T.WATER);
    expect(run(w)).toBeLessThan(600);
    expect(volumeOf(w, T.WATER)).toBe(vol);
    expect(Math.abs(surface(w, 4) - surface(w, 10))).toBeLessThan(PRESSURE_HEAD);
    expect(w.get(10, 12)).toBe(T.WATER);
    const before = w.tiles.slice();
    for (let t = 0; t < 20; t++) expect(flowLiquids(w, 10, 10, t)).toBe(0);
    expect(w.tiles).toEqual(before);
  });

  it('never lifts water above the surface that pushes it, and conserves volume every tick', () => {
    const w = uBend();
    const vol = volumeOf(w, T.WATER);
    const top = surface(w, 4);
    for (let t = 0; t < 300; t++) {
      flowLiquids(w, 10, 10, t);
      expect(volumeOf(w, T.WATER)).toBe(vol);
      expect(surface(w, 10)).toBeLessThanOrEqual(top);
    }
  });

  it('magma also levels through a U-bend, just slower', () => {
    const w = uBend(T.MAGMA);
    const vol = volumeOf(w, T.MAGMA);
    run(w, 1500);
    expect(volumeOf(w, T.MAGMA)).toBe(vol);
    expect(Math.abs(surface(w, 4, T.MAGMA) - surface(w, 10, T.MAGMA))).toBeLessThan(PRESSURE_HEAD);
  });

  it('a capped far shaft only fills up to its lid', () => {
    const w = uBend();
    w.set(10, 13, T.BEDROCK);
    w.set(11, 13, T.BEDROCK);
    const vol = volumeOf(w, T.WATER);
    run(w);
    expect(volumeOf(w, T.WATER)).toBe(vol);
    expect(w.get(10, 14)).toBe(T.WATER);
    expect(w.get(10, 12)).toBe(T.AIR);
  });

  it('two separate pools at different heights do not push into each other', () => {
    const w = rock();
    carve(w, 3, 5, 5, 9, T.WATER);
    carve(w, 10, 12, 12, 15, T.WATER);
    carve(w, 10, 8, 12, 11);
    for (let t = 0; t < 50; t++) expect(flowLiquids(w, 10, 10, t)).toBe(0);
  });

  it('a film on top of a full pool stays put (no 1 px sheets pushed up a ledge)', () => {
    const w = rock();
    carve(w, 3, 8, 12, 15);
    carve(w, 3, 11, 12, 15, T.WATER);
    carve(w, 3, 10, 5, 10, T.WATER);
    run(w);
    const levels = [] as number[];
    for (let x = 3; x <= 12; x++) levels.push(surface(w, x));
    expect(Math.max(...levels) - Math.min(...levels)).toBeLessThanOrEqual(PRESSURE_HEAD);
  });
});
