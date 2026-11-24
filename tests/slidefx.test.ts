import { describe, it, expect } from 'vitest';
import { Fx } from '../src/render/fx';

describe('wall-slide trail', () => {
  it('trickles grit off the wall only while sliding', () => {
    const fx = new Fx();
    expect(fx.wallSlideTrail(0.5, 0, 10, 10, '#888')).toBe(0);
    let n = 0;
    for (let i = 0; i < 30; i++) n += fx.wallSlideTrail(1 / 60, 1, 10, 10, '#888');
    expect(n).toBeGreaterThanOrEqual(6);
    expect(n).toBeLessThanOrEqual(8);
    const p = fx.particles[fx.particles.length - 1];
    expect(p.x).toBeGreaterThan(10); // spawns on the wall side
    expect(p.vx).toBeLessThan(0); // drifts away from the wall
  });
  it('resets the accumulator when the slide ends', () => {
    const fx = new Fx();
    fx.wallSlideTrail(0.05, 1, 0, 0, '#888');
    fx.wallSlideTrail(0.05, 0, 0, 0, '#888');
    expect(fx.wallSlideTrail(0.01, 1, 0, 0, '#888')).toBe(0);
  });
});

describe('charge fuse sparks', () => {
  it('emits sparks per live fuse and none without fuses', () => {
    const fx = new Fx();
    expect(fx.fuseSparks(1 / 60, [])).toBe(0);
    const n = fx.fuseSparks(1 / 60, [{ x: 5, y: 5 }, { x: 8, y: 5 }]);
    expect(n).toBeGreaterThanOrEqual(2);
    expect(fx.particles[0].vy).toBeLessThan(0);
  });
});
