import { describe, expect, it } from 'vitest';
import { BUBBLE_EVERY, Fx, splashColor, splashPower } from '../src/render/fx';

describe('splash and bubbles', () => {
  it('wading in slowly makes no splash; falling in makes a big one', () => {
    expect(splashPower(1, true)).toBe(0);
    expect(splashPower(8, true)).toBeGreaterThan(0.3);
    expect(splashPower(30, true)).toBe(1);
    expect(splashPower(6, true)).toBeLessThan(splashPower(12, true));
  });

  it('leaving is softer than entering and needs upward speed', () => {
    expect(splashPower(-12, false)).toBeGreaterThan(0);
    expect(splashPower(-12, false)).toBeLessThan(splashPower(12, true));
    expect(splashPower(5, false)).toBe(0);
  });

  it('a splash throws droplets up from the surface and rings it', () => {
    const fx = new Fx();
    const n = fx.splash(10, 20, 0.8, splashColor('water'));
    expect(n).toBeGreaterThan(10);
    expect(fx.particles.length).toBe(n);
    expect(fx.particles.filter((p) => p.vy < -1).length).toBeGreaterThan(5);
    expect(fx.particles.every((p) => Math.abs(p.y - 20) < 0.2)).toBe(true);
    expect(fx.rings.length).toBe(1);
    expect(fx.rings[0].flat).toBeLessThan(0.5);
    expect(fx.splash(10, 20, 0, splashColor('water'))).toBe(0);
  });

  it('bigger splashes make more droplets', () => {
    const a = new Fx();
    const b = new Fx();
    expect(b.splash(0, 0, 1, splashColor('acid'))).toBeGreaterThan(a.splash(0, 0, 0.1, splashColor('acid')));
  });

  it('acid and magma splash in their own glow colours', () => {
    expect(splashColor('acid').drop).not.toBe(splashColor('water').drop);
    expect(splashColor('magma').drop).not.toBe(splashColor('acid').drop);
  });

  it('the helmet leaks hollow bubbles at a steady rate only while under', () => {
    const fx = new Fx();
    for (let i = 0; i < 60; i++) fx.bubbles(1 / 60, true, 5, 5, 1, '#fff');
    const made = fx.particles.length;
    expect(made).toBe(Math.floor(1 / BUBBLE_EVERY));
    expect(fx.particles.every((p) => p.hollow && (p.g ?? 0) < 0 && p.size >= 3)).toBe(true);
    for (let i = 0; i < 60; i++) fx.bubbles(1 / 60, false, 5, 5, 1, '#fff');
    expect(fx.particles.length).toBe(made);
  });

  it('bubbles rise and their sideways drift dies down', () => {
    const fx = new Fx();
    fx.bubbles(BUBBLE_EVERY, true, 5, 5, 1, '#fff');
    const p = fx.particles[0];
    p.vx = 2;
    const y0 = p.y;
    for (let i = 0; i < 30; i++) fx.update(1 / 60);
    expect(p.y).toBeLessThan(y0);
    expect(Math.abs(p.vx)).toBeLessThan(1.5);
  });
});
