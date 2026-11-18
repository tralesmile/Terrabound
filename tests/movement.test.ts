import { describe, expect, it } from 'vitest';
import { MOVE, stepVx } from '../src/sim/movement';

const run = (vx: number, mx: number, grounded: boolean, t: number, speed = 7): number => {
  const dt = 1 / 60;
  for (let i = 0; i < Math.round(t / dt); i++) vx = stepVx(vx, mx, speed, grounded, dt);
  return vx;
};

describe('movement v2', () => {
  it('reaches top speed on the ground within 0.15 s and never exceeds it', () => {
    expect(run(0, 1, true, 0.15)).toBeCloseTo(7, 5);
    expect(run(0, 1, true, 2)).toBe(7);
  });
  it('air acceleration is slower than ground', () => {
    expect(run(0, 1, false, 0.1)).toBeLessThan(run(0, 1, true, 0.1));
  });
  it('stops on the ground in a short distance, drifts further in the air', () => {
    const dist = (grounded: boolean): number => {
      let vx = 7, x = 0;
      for (let i = 0; i < 600 && vx !== 0; i++) { vx = stepVx(vx, 0, 7, grounded, 1 / 60); x += vx / 60; }
      return x;
    };
    expect(dist(true)).toBeLessThan(0.5);
    expect(dist(false)).toBeGreaterThan(dist(true) * 2);
  });
  it('turning around is faster than starting from rest in the air', () => {
    const turn = run(7, -1, true, 0.1);
    expect(turn).toBeLessThan(0);
    expect(MOVE.turnBoost).toBeGreaterThan(1);
  });
  it('speed above the cap bleeds off smoothly rather than snapping', () => {
    const v = stepVx(24, 1, 7, true, 1 / 60);
    expect(v).toBeLessThan(24);
    expect(v).toBeGreaterThan(7);
  });
});
