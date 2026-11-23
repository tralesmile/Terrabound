import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';
import { WALL, wallSide } from '../src/sim/movement';

const run = (g: Game, s: number, c: Partial<Controls> = {}): void => {
  for (let i = 0; i < Math.round(s / FIXED_DT); i++) g.step(FIXED_DT, { ...NO_CONTROLS, ...c });
};

/** A tall shaft: open air with a solid wall on the right, floor far below. */
function shaft(): { g: Game; x: number; y: number } {
  const g = new Game(defaultSave());
  const w = g.world;
  const x = w.padX + 80;
  const y = w.surface[x];
  for (let xx = x - 6; xx <= x + 6; xx++) {
    for (let yy = y - 60; yy < y; yy++) w.set(xx, yy, xx > x ? T.RUST : T.AIR);
    w.set(xx, y, T.RUST);
  }
  g.body.x = x + 0.6;
  g.body.y = y - 40;
  g.body.vx = g.body.vy = 0;
  g.enemies = [];
  return { g, x, y };
}

describe('wall slide and wall jump', () => {
  it('wallSide reports the solid side and 0 in open air or between two walls', () => {
    const solid = (x: number): boolean => x >= 5;
    expect(wallSide((x) => solid(x), 4.6, 10, 0.35, 1.8)).toBe(1);
    expect(wallSide((x) => solid(x), 1, 10, 0.35, 1.8)).toBe(0);
    expect(wallSide(() => true, 4, 10, 0.35, 1.8)).toBe(0);
  });

  it('pressing into a wall caps the fall speed; free fall is faster', () => {
    const a = shaft();
    run(a.g, 0.8, { moveX: 1 });
    expect(a.g.body.vy).toBeLessThanOrEqual(WALL.slideFall + 1e-6);
    expect(a.g.wallSlide).toBe(1);
    const b = shaft();
    run(b.g, 0.8);
    expect(b.g.body.vy).toBeGreaterThan(WALL.slideFall + 2);
  });

  it('jump on a wall kicks away and up, limited to three per airtime', () => {
    const { g } = shaft();
    run(g, 0.3, { moveX: 1 });
    run(g, 0.02, { jump: true });
    expect(g.body.vy).toBeLessThan(0);
    expect(g.body.vx).toBeLessThan(0);
    expect(g.facing).toBe(-1);
    // Count wall jumps by re-pressing against the wall.
    let jumps = 1;
    for (let k = 0; k < 6; k++) {
      run(g, 0.4, { moveX: 1 });
      run(g, 0.02);
      const vy0 = g.body.vy;
      run(g, 0.03, { moveX: 1, jump: true });
      if (g.body.vy < vy0 - 3) jumps++;
    }
    expect(jumps).toBeLessThanOrEqual(WALL.maxJumps + 0); // never more than the cap
  });
});
