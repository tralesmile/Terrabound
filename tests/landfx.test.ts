import { describe, it, expect } from 'vitest';
import { Fx, SQUASH_TIME, STEP_EVERY, landPower, squashScale } from '../src/render/fx';

describe('landing and footstep feedback', () => {
  it('squash is wide and short at impact and eases back to 1', () => {
    const hit = squashScale(SQUASH_TIME, 1);
    expect(hit.sx).toBeGreaterThan(1.15);
    expect(hit.sy).toBeLessThan(0.85);
    const mid = squashScale(SQUASH_TIME / 2, 1);
    expect(mid.sx).toBeLessThan(hit.sx);
    expect(mid.sx).toBeGreaterThan(1);
    expect(squashScale(0, 1)).toEqual({ sx: 1, sy: 1 });
    expect(squashScale(SQUASH_TIME, 0)).toEqual({ sx: 1, sy: 1 });
  });
  it('soft hops do not squash; hard landings saturate', () => {
    expect(landPower(3)).toBe(0);
    expect(landPower(10)).toBeGreaterThan(0);
    expect(landPower(10)).toBeLessThan(1);
    expect(landPower(60)).toBe(1);
  });
  it('a landing starts the squash and kicks dust both ways', () => {
    const fx = new Fx();
    fx.land(10, 20, 14, '#935c48');
    expect(fx.squashLeft).toBe(SQUASH_TIME);
    expect(fx.particles.length).toBeGreaterThanOrEqual(4);
    expect(fx.particles.some((p) => p.vx < 0)).toBe(true);
    expect(fx.particles.some((p) => p.vx > 0)).toBe(true);
    expect(fx.particles.every((p) => p.color === '#935c48')).toBe(true);
    fx.update(SQUASH_TIME + 0.01);
    expect(fx.squashLeft).toBe(0);
  });
  it('a tiny landing does nothing', () => {
    const fx = new Fx();
    fx.land(0, 0, 2, '#fff');
    expect(fx.squashLeft).toBe(0);
    expect(fx.particles.length).toBe(0);
  });
  it('footsteps puff behind the runner at a steady rate and stop when idle', () => {
    const fx = new Fx();
    const dt = 1 / 60;
    for (let i = 0; i < Math.round((STEP_EVERY * 3) / dt) + 1; i++) fx.footsteps(dt, true, 5, 5, 1, '#aaa');
    expect(fx.particles.length).toBe(6);
    expect(fx.particles.every((p) => p.vx < 0)).toBe(true);
    const n = fx.particles.length;
    for (let i = 0; i < 60; i++) fx.footsteps(dt, false, 5, 5, 1, '#aaa');
    expect(fx.particles.length).toBe(n);
  });
});

describe('enemy hit squash', () => {
  it('squashes wide on the hit frame, stretches back, then settles', async () => {
    const { hitSquash, HIT_SQUASH_TIME } = await import('../src/render/fx');
    const { ENEMY_HIT_IFRAMES } = await import('../src/sim/enemies');
    expect(HIT_SQUASH_TIME).toBe(ENEMY_HIT_IFRAMES);
    const hit = hitSquash(HIT_SQUASH_TIME);
    expect(hit.sx).toBeGreaterThan(1.25);
    expect(hit.sy).toBeLessThan(0.75);
    const late = hitSquash(HIT_SQUASH_TIME * 0.15);
    expect(late.sy).toBeGreaterThan(1); // the spring-back stretch
    expect(late.sy - 1).toBeLessThan(1 - hit.sy);
    expect(hitSquash(0)).toEqual({ sx: 1, sy: 1 });
    expect(hitSquash(-1)).toEqual({ sx: 1, sy: 1 });
  });
});
