import { FIXED_DT, Game, NO_CONTROLS } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { T } from '../src/sim/tiles';
import { HALF_W, boxCollides, cornerNudge, dropIn, ledgePop, moveY, probeGround, type Body } from '../src/sim/physics';

/** An empty room with a stone floor along row 30. */
function room(): World {
  const w = new World(40, 40, 3);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) w.set(x, y, y >= 30 ? T.RUST : T.AIR);
  return w;
}
const body = (x: number, y = 30): Body => ({ x, y, vx: 0, vy: 0, onGround: true });

describe('corner correction', () => {
  /** A one-wide shaft at column 10 through a ceiling on rows 25..27. */
  const shaft = (): World => {
    const w = room();
    for (let y = 25; y <= 27; y++) for (let x = 5; x < 16; x++) if (x !== 10) w.set(x, y, T.RUST);
    return w;
  };
  const jumpUp = (w: World, b: Body, nudge: boolean): number => {
    let vy = -13;
    let top = b.y;
    for (let i = 0; i < 60; i++) {
      if (nudge && vy < 0) cornerNudge(w, b, vy / 60);
      if (moveY(w, b, vy / 60) && vy < 0) vy = 0;
      vy += 42 / 60;
      top = Math.min(top, b.y);
    }
    return top;
  };

  it('a jump that clips a shaft mouth by a little slides in', () => {
    expect(jumpUp(shaft(), body(10.75), false)).toBeGreaterThan(29);
    expect(jumpUp(shaft(), body(10.75), true)).toBeLessThan(28.5);
    expect(jumpUp(shaft(), body(10.25), true)).toBeLessThan(28.5);
  });
  it('a head that is mostly under the block still bonks', () => {
    const w = shaft();
    const b = body(11.4, 29.82);
    expect(cornerNudge(w, b, -0.2)).toBe(false);
    expect(b.x).toBe(11.4);
  });
  it('never shifts against the held direction and never into a block', () => {
    const w = shaft();
    const b = body(10.75, 29.82);
    expect(cornerNudge(w, b, -0.2, 1)).toBe(false);
    expect(cornerNudge(w, b, -0.2, -1)).toBe(true);
    expect(boxCollides(w, b.x, b.y)).toBe(false);
    expect(boxCollides(w, b.x, b.y - 0.2)).toBe(false);
  });
  it('does nothing when falling or when nothing is in the way', () => {
    const w = shaft();
    expect(cornerNudge(w, body(10.75, 29.82), 0.2)).toBe(false);
    expect(cornerNudge(w, body(20, 29.82), -0.2)).toBe(false);
  });
});

describe('drop-in', () => {
  const holed = (): World => {
    const w = room();
    for (let y = 30; y < 35; y++) w.set(10, y, T.AIR);
    return w;
  };
  const fall = (w: World, b: Body, hold: boolean): number => {
    for (let i = 0; i < 60; i++) {
      if (hold && probeGround(w, b)) dropIn(w, b, 1 / 60);
      b.vy = Math.min(24, b.vy + 42 / 60);
      moveY(w, b, b.vy / 60);
    }
    return b.y;
  };
  it('without it the body hangs on the rim; holding down drops into the hole', () => {
    expect(fall(holed(), body(10.2), false)).toBe(30);
    for (const x of [10.02, 10.2, 10.8, 10.98]) expect(fall(holed(), body(x), true)).toBeGreaterThan(34);
  });
  it('stays put when the middle of the body is over solid ground', () => {
    const w = holed();
    const b = body(9.8);
    expect(dropIn(w, b, 1 / 60)).toBe(false);
    expect(b.x).toBe(9.8);
  });
  it('slides smoothly and stops once the body fits', () => {
    const w = holed();
    const b = body(10.05);
    expect(dropIn(w, b, 1 / 60)).toBe(true);
    expect(b.x).toBeLessThanOrEqual(10.05 + 0.11);
    for (let i = 0; i < 10; i++) dropIn(w, b, 1 / 60);
    expect(b.x).toBeCloseTo(10 + HALF_W, 5);
  });
});

describe('ledge pop-up', () => {
  /** A two-tile-high ledge: columns 12 and up are solid from row 28 (its top is y = 28). */
  const ledge = (): World => {
    const w = room();
    for (let y = 28; y < 30; y++) for (let x = 12; x < 40; x++) w.set(x, y, T.RUST);
    return w;
  };
  const at = (y: number, vy = 2): Body => ({ x: 12 - HALF_W - 0.001, y, vx: 6, vy, onGround: false });

  it('pops onto a lip missed by under a quarter tile, rising or falling', () => {
    const w = ledge();
    for (const vy of [-3, 0, 6]) {
      const b = at(28.2, vy);
      expect(ledgePop(w, b, 1)).toBe(true);
      expect(b.y).toBe(28);
      expect(b.vy).toBe(Math.min(0, vy));
      expect(boxCollides(w, b.x, b.y)).toBe(false);
    }
  });
  it('refuses a bigger miss, a hard fall, no held direction, and a ledge with no headroom', () => {
    const w = ledge();
    expect(ledgePop(w, at(28.4), 1)).toBe(false);
    expect(ledgePop(w, at(28.2, 15), 1)).toBe(false);
    expect(ledgePop(w, at(28.2), 0)).toBe(false);
    expect(ledgePop(w, at(28.2), -1)).toBe(false);
    for (let x = 12; x < 20; x++) w.set(x, 27, T.RUST);
    expect(ledgePop(w, at(28.2), 1)).toBe(false);
  });
  it('a sim jump that just misses a ledge lands on it', () => {
    const g = new Game(defaultSave());
    const x0 = Math.floor(g.world.padX) + 40;
    const floor = Math.floor(g.world.padY);
    for (let x = x0 - 6; x <= x0 + 8; x++) for (let y = floor - 12; y <= floor; y++) g.world.set(x, y, y === floor || (x >= x0 && y >= floor - 3) ? T.METAL : T.AIR);
    g.enemies = [];
    Object.assign(g.body, { x: x0 - HALF_W - 0.02, y: floor - 3 + 0.2, vx: 6, vy: 3, onGround: false });
    g.step(FIXED_DT, { ...NO_CONTROLS, moveX: 1 });
    expect(g.ledgeSaves).toBe(1);
    for (let i = 0; i < 30; i++) g.step(FIXED_DT, NO_CONTROLS);
    expect(g.body.y).toBeCloseTo(floor - 3, 1);
    expect(g.body.x).toBeGreaterThan(x0 - HALF_W);
  });
});
