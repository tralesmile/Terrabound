import { describe, it, expect } from 'vitest';
import { Fx, lighten, slamFistOffset } from '../src/render/fx';
import { SLAM_RADIUS } from '../src/sim/bosses';

describe('boss slam impact', () => {
  it('fists land just past the body edge', () => {
    expect(slamFistOffset(1.4)).toBeGreaterThan(1.4);
    expect(slamFistOffset(1.4)).toBeLessThan(2.5);
  });
  it('draws a flat shockwave as wide as the slam reach, plus dust and debris both ways', () => {
    const fx = new Fx();
    const n = fx.slamImpact(50, 30, 1.4, SLAM_RADIUS, '#935c48', '#c77a5e');
    expect(n).toBeGreaterThanOrEqual(20);
    const wave = fx.rings.find((r) => r.r === SLAM_RADIUS);
    expect(wave).toBeDefined();
    expect(wave!.flat).toBeLessThan(0.5);
    expect(fx.rings.length).toBe(2);
    const left = fx.particles.filter((p) => p.vx < 0).length;
    const right = fx.particles.filter((p) => p.vx > 0).length;
    expect(left).toBeGreaterThan(5);
    expect(right).toBeGreaterThan(5);
    // Debris is thrown up hard, from both fists, with the boss accent mixed in.
    const debris = fx.particles.filter((p) => p.vy < -4);
    expect(debris.some((p) => p.x < 50 - 1.4)).toBe(true);
    expect(debris.some((p) => p.x > 50 + 1.4)).toBe(true);
    expect(fx.particles.some((p) => p.color === '#c77a5e')).toBe(true);
    expect(fx.shake).toBeGreaterThan(0);
  });
  it('lighten mixes toward white and survives bad input', () => {
    expect(lighten('#000000', 0.5)).toBe('#808080');
    expect(lighten('#935c48', 0)).toBe('#935c48');
    expect(lighten('#935c48', 1)).toBe('#ffffff');
    expect(lighten('bad', 0.5)).toMatch(/^#[0-9a-f]{6}$/);
  });
  it('respects the particle cap', () => {
    const fx = new Fx();
    for (let i = 0; i < 40; i++) fx.slamImpact(50, 30, 1.4, SLAM_RADIUS, '#935c48', '#c77a5e');
    expect(fx.particles.length).toBeLessThanOrEqual(400);
  });
});
