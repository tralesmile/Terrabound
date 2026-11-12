import { describe, it, expect } from 'vitest';
import { Fx, HURT_TIME, LOW_HP, hurtPower, hurtSquash, hurtVignette } from '../src/render/fx';

describe('player hurt feedback', () => {
  it('vignette flashes on a hit and fades to nothing at full health', () => {
    const hit = hurtVignette(HURT_TIME, 1, 1, 0);
    expect(hit).toBeGreaterThan(0.4);
    expect(hurtVignette(HURT_TIME / 2, 1, 1, 0)).toBeLessThan(hit);
    expect(hurtVignette(0, 1, 1, 0)).toBe(0);
  });
  it('low HP beats red without a hit, stronger near death, never above 0.6', () => {
    expect(hurtVignette(0, 0, LOW_HP + 0.05, 0.2)).toBe(0);
    let peakHalf = 0;
    let peakLow = 0;
    for (let t = 0; t < 1; t += 0.01) {
      peakHalf = Math.max(peakHalf, hurtVignette(0, 0, LOW_HP * 0.8, t));
      peakLow = Math.max(peakLow, hurtVignette(0, 0, 0.02, t));
      expect(hurtVignette(HURT_TIME, 1, 0.01, t)).toBeLessThanOrEqual(0.6);
    }
    expect(peakHalf).toBeGreaterThan(0.05);
    expect(peakLow).toBeGreaterThan(peakHalf);
    // Dead (hp 0) does not beat: the death screen takes over.
    expect(hurtVignette(0, 0, 0, 0.2)).toBe(0);
  });
  it('small ticks still read; big hits saturate', () => {
    expect(hurtPower(1, 100)).toBeCloseTo(0.35);
    expect(hurtPower(40, 100)).toBe(1);
    expect(hurtPower(10, 100)).toBeGreaterThan(0.35);
  });
  it('recoil squeezes thin and tall, then settles', () => {
    const s = hurtSquash(HURT_TIME);
    expect(s.sx).toBeLessThan(1);
    expect(s.sy).toBeGreaterThan(1);
    expect(hurtSquash(0)).toEqual({ sx: 1, sy: 1 });
    const late = hurtSquash(0.01);
    expect(Math.abs(late.sx - 1)).toBeLessThan(0.01);
  });
  it('Fx.hurt sets the timer, shows a damage number and decays', () => {
    const fx = new Fx();
    fx.hurt(3, 4, 15, 100);
    expect(fx.hurtLeft).toBe(HURT_TIME);
    expect(fx.texts.at(-1)?.text).toBe('-15');
    fx.hurt(3, 4, 0.4, 100); // sub-1 ticks: no number spam
    expect(fx.texts.length).toBe(1);
    fx.update(HURT_TIME + 0.1);
    expect(fx.hurtLeft).toBe(0);
  });
});
