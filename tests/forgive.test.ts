import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { T } from '../src/sim/tiles';
import { HALF_W, boxCollides, cornerNudge, dropIn, moveY, probeGround, type Body } from '../src/sim/physics';

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
