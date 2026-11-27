/** Guards for the sim shortcuts that keep steps cheap (run 105): they must not change what happens. */
import { describe, expect, it } from 'vitest';
import { firstEmitterAt, inGas, placeHazards } from '../src/sim/hazards';
import { coolMagma } from '../src/sim/liquids';
import { findRooms } from '../src/sim/rooms';
import { T } from '../src/sim/tiles';
import { World, generateWorld } from '../src/sim/world';

/** Open 120x60 world, pad at (60, 20), with one sealed metal box on the base. */
function boxed(): World {
  const w = new World(120, 60, 7);
  Object.assign(w, { padX: 60, padY: 20 });
  for (let y = 20; y < 60; y++) for (let x = 0; x < 120; x++) w.set(x, y, T.RUST);
  for (let x = 54; x <= 62; x++) for (const y of [14, 19]) w.set(x, y, T.METAL);
  for (let y = 14; y <= 19; y++) for (const x of [54, 62]) w.set(x, y, T.METAL);
  return w;
}

describe('room watch', () => {
  it('counts every change before the first scan', () => {
    const w = boxed();
    const v = w.roomVersion;
    w.set(5, 50, T.AIR);
    expect(w.roomVersion).toBe(v + 1);
  });

  it('ignores digging far from the base but sees walls, insides and back walls', () => {
    const w = boxed();
    expect(findRooms(w)).toHaveLength(1);
    let v = w.roomVersion;
    w.set(5, 50, T.AIR);
    w.set(100, 40, T.AIR);
    expect(w.roomVersion).toBe(v);
    w.set(58, 18, T.LAMP); // furniture inside the room
    expect(w.roomVersion).toBeGreaterThan(v);
    v = w.roomVersion;
    w.setWall(57, 17, 1);
    expect(w.roomVersion).toBeGreaterThan(v);
    v = w.roomVersion;
    w.set(54, 17, T.AIR); // breach a side wall
    expect(w.roomVersion).toBeGreaterThan(v);
    expect(findRooms(w)).toHaveLength(0);
  });

  it('sees a leaking pocket being sealed into a new room', () => {
    const w = boxed();
    w.set(54, 17, T.AIR);
    findRooms(w);
    const v = w.roomVersion;
    w.set(54, 17, T.METAL);
    expect(w.roomVersion).toBeGreaterThan(v);
    expect(findRooms(w)).toHaveLength(1);
  });
});

describe('hazard shortcuts', () => {
  it('emitters come sorted by column and the search finds the first at or past x', () => {
    const { emitters } = placeHazards(generateWorld(3));
    expect(emitters.length).toBeGreaterThan(10);
    for (let i = 1; i < emitters.length; i++) expect(emitters[i].x).toBeGreaterThanOrEqual(emitters[i - 1].x);
    for (const x of [0, emitters[5].x, emitters[5].x + 0.1, 1400, 1e6]) {
      const i = firstEmitterAt(emitters, x);
      expect(i).toBe(emitters.filter((e) => e.x < x).length);
    }
  });

  it('the gas test matches the plain circle test', () => {
    const gas = [{ x: 10, y: 10, r: 2.5 }];
    for (let x = 6; x <= 14; x += 0.37) for (let y = 6; y <= 14; y += 0.41) expect(inGas(gas, x, y)).toBe(Math.hypot(x - 10, y - 10) <= 2.5);
  });
});

describe('coolMagma row skip', () => {
  it('cools magma at both edges of the window and every hit in one row, not outside it', () => {
    const w = new World(200, 100, 1);
    const xs = [52, 60, 61, 148, 160];
    for (const x of xs) {
      w.set(x, 50, T.MAGMA);
      w.set(x, 49, T.WATER);
    }
    const out = coolMagma(w, 100, 50, 48, 10);
    expect(out.map((c) => c.x)).toEqual([52, 60, 61, 148]);
    expect(w.get(160, 50)).toBe(T.MAGMA);
  });
});
