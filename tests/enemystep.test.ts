import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { T } from '../src/sim/tiles';
import { ENEMY_STEP_EASE, enemyStepUp, makeEnemy, stepEnemy } from '../src/sim/enemies';
import { stepEase } from '../src/sim/physics';

/** 120x40 world with a flat rust floor at row 20 (feet at y = 20). */
function flat(): World {
  const w = new World(120, 40, 3);
  for (let y = 20; y < 40; y++) for (let x = 0; x < 120; x++) w.set(x, y, T.RUST);
  return w;
}
const run = (w: World, e: ReturnType<typeof makeEnemy>, secs: number, px: number, py: number) => {
  for (let i = 0; i < secs * 30; i++) stepEnemy(w, e, 1 / 30, px, py);
};

describe('walker auto-step', () => {
  it('a chasing crawler climbs a one-tile staircase to the player', () => {
    const w = flat();
    for (let s = 0; s < 3; s++) for (let x = 50 + s * 4; x < 120; x++) w.set(x, 19 - s, T.RUST);
    const e = makeEnemy(1, 'crawler', 46.5, 20);
    run(w, e, 15, 64.5, 17);
    expect(e.x).toBeGreaterThan(60);
    expect(e.y).toBeCloseTo(17, 1);
  });

  it('refuses a two-tile wall and a ledge with no headroom', () => {
    const w = flat();
    for (let y = 18; y < 20; y++) w.set(51, y, T.RUST);
    const e = makeEnemy(1, 'crawler', 50.5, 20);
    expect(enemyStepUp(w, e, 1)).toBe(false);
    expect(e.x).toBe(50.5);
    expect(e.y).toBe(20);
    const w2 = flat();
    w2.set(51, 19, T.RUST);
    // Ceiling right above the step: the body (0.7 tall) cannot fit on top.
    for (let x = 48; x < 54; x++) w2.set(x, 18, T.RUST);
    const f = makeEnemy(2, 'crawler', 50.5, 20);
    expect(enemyStepUp(w2, f, 1)).toBe(false);
    expect(f.y).toBe(20);
  });

  it('a successful step moves up exactly one tile and sets the render lift, which eases out', () => {
    const w = flat();
    w.set(51, 19, T.RUST);
    const e = makeEnemy(1, 'crawler', 50.6, 20);
    expect(enemyStepUp(w, e, 1)).toBe(true);
    expect(e.y).toBe(19);
    expect(e.lift).toBe(1);
    expect(stepEase(1)).toBe(1);
    expect(stepEase(0)).toBe(0);
    expect(stepEase(0.5)).toBeCloseTo(0.5);
    run(w, e, 1.5 / ENEMY_STEP_EASE + 0.2, 80, 19);
    expect(e.lift).toBe(0);
  });

  it('patrollers walk down a one-tile drop but turn at a real cliff', () => {
    const w = flat();
    for (let x = 60; x < 120; x++) w.set(x, 20, T.AIR);
    const e = makeEnemy(1, 'crawler', 55.5, 20);
    e.dir = 1;
    run(w, e, 4, 0, 0);
    expect(e.x).toBeGreaterThan(60);
    expect(e.y).toBeCloseTo(21, 1);
    const w2 = flat();
    for (let x = 60; x < 120; x++) for (let y = 20; y < 23; y++) w2.set(x, y, T.AIR);
    const f = makeEnemy(2, 'crawler', 55.5, 20);
    f.dir = 1;
    run(w2, f, 4, 0, 0);
    expect(f.x).toBeLessThan(60);
  });

  it('flyers ignore steps and the walker stays deterministic', () => {
    const w = flat();
    for (let s = 0; s < 3; s++) for (let x = 50 + s * 4; x < 120; x++) w.set(x, 19 - s, T.RUST);
    const a = makeEnemy(1, 'hulk', 46.5, 20);
    const b = makeEnemy(1, 'hulk', 46.5, 20);
    run(w, a, 5, 64.5, 17);
    run(w, b, 5, 64.5, 17);
    expect([a.x, a.y]).toEqual([b.x, b.y]);
    const fl = makeEnemy(3, 'flyer', 46.5, 15);
    run(w, fl, 2, 64.5, 15);
    expect(fl.lift).toBeUndefined();
  });
});
